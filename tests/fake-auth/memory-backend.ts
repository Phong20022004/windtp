import { AuthFailure, type AuthBackend, type BackendUser, type Persistence } from "../../src/auth/types";

interface StoredUser {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  emailVerified: boolean;
  admin: boolean;
}

type Listener = (user: BackendUser | null) => void;

const DB_KEY = "__fake_auth_db";
const SESSION_KEY = "__fake_auth_session";
const MAX_FAILS = 5;

/** Giao diện điều khiển cho test trình duyệt, gắn vào window.__fakeAuth. */
export interface FakeAuthControl {
  seed(user: { email: string; password: string; name: string; admin?: boolean }): void;
  setAdmin(email: string, admin: boolean): void;
  resets: string[];
  nextGoogleEmail: string | null;
}

/** Backend chạy hoàn toàn trong trình duyệt, chỉ dùng cho build kiểm thử (không dùng ở production). */
export class MemoryAuthBackend implements AuthBackend {
  private readonly listeners = new Set<Listener>();
  private fails = 0;
  readonly control: FakeAuthControl;

  constructor() {
    this.control = {
      seed: ({ email, password, name, admin = false }) => {
        const db = this.readDb();
        db.push({ uid: "uid-" + db.length, email, password, displayName: name, emailVerified: true, admin });
        this.writeDb(db);
      },
      setAdmin: (email, admin) => {
        const db = this.readDb();
        const user = db.find((u) => u.email === email);
        if (user) user.admin = admin;
        this.writeDb(db);
        this.emit();
      },
      resets: [],
      nextGoogleEmail: null,
    };
  }

  private readDb(): StoredUser[] {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY) ?? "[]") as StoredUser[];
    } catch {
      return [];
    }
  }

  private writeDb(db: StoredUser[]): void {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  private sessionUid(): string | null {
    return sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
  }

  private setSession(uid: string, persistence: Persistence): void {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    (persistence === "local" ? localStorage : sessionStorage).setItem(SESSION_KEY, uid);
  }

  private currentUser(): BackendUser | null {
    const uid = this.sessionUid();
    const stored = uid ? this.readDb().find((u) => u.uid === uid) : undefined;
    return stored ? this.publicUser(stored) : null;
  }

  private publicUser(stored: StoredUser): BackendUser {
    return {
      uid: stored.uid,
      email: stored.email,
      displayName: stored.displayName,
      emailVerified: stored.emailVerified,
      admin: stored.admin,
    };
  }

  private emit(): void {
    const user = this.currentUser();
    this.listeners.forEach((listener) => listener(user));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    queueMicrotask(() => listener(this.currentUser()));
    return () => this.listeners.delete(listener);
  }

  async signUp({ email, password, name }: { email: string; password: string; name: string }, persistence: Persistence): Promise<BackendUser> {
    const db = this.readDb();
    if (db.some((u) => u.email === email)) throw new AuthFailure("email-in-use");
    const stored: StoredUser = { uid: "uid-" + db.length, email, password, displayName: name, emailVerified: false, admin: false };
    db.push(stored);
    this.writeDb(db);
    this.setSession(stored.uid, persistence);
    this.emit();
    return this.publicUser(stored);
  }

  async signIn({ email, password }: { email: string; password: string }, persistence: Persistence): Promise<BackendUser> {
    if (this.fails >= MAX_FAILS) throw new AuthFailure("too-many-requests");
    const stored = this.readDb().find((u) => u.email === email && u.password === password);
    if (!stored) {
      this.fails += 1;
      throw new AuthFailure("invalid-credentials");
    }
    this.fails = 0;
    this.setSession(stored.uid, persistence);
    this.emit();
    return this.publicUser(stored);
  }

  async signInWithGoogle(persistence: Persistence): Promise<BackendUser> {
    const email = this.control.nextGoogleEmail;
    if (!email) throw new AuthFailure("popup-closed");
    const db = this.readDb();
    let stored = db.find((u) => u.email === email);
    if (!stored) {
      stored = { uid: "uid-" + db.length, email, password: "", displayName: email.split("@")[0] ?? "", emailVerified: true, admin: false };
      db.push(stored);
      this.writeDb(db);
    }
    this.setSession(stored.uid, persistence);
    this.emit();
    return this.publicUser(stored);
  }

  async sendPasswordReset(email: string): Promise<void> {
    this.control.resets.push(email);
  }

  /** Token dạng `test.<base64url(JSON)>`: chỉ máy chủ API chạy cho test (tests/api-server.mjs) chấp nhận, không bao giờ có ở production. */
  async getIdToken(): Promise<string | null> {
    const user = this.currentUser();
    if (!user) return null;
    const claims = JSON.stringify({ sub: user.uid, email: user.email, name: user.displayName, admin: user.admin });
    const bytes = new TextEncoder().encode(claims);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return "test." + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async signOut(): Promise<void> {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    this.emit();
  }
}
