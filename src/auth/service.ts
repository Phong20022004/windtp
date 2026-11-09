import {
  AuthFailure,
  type AccountListener,
  type AuthAccount,
  type AuthBackend,
  type AuthService,
  type BackendUser,
  type Persistence,
} from "./types";

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const MIN_PASSWORD = 6;
const NAME_MIN = 2;
const NAME_MAX = 30;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function toAccount(user: BackendUser): AuthAccount {
  const email = normalizeEmail(user.email);
  return {
    uid: user.uid,
    email,
    name: user.displayName.trim() || email.split("@")[0] || "",
    emailVerified: user.emailVerified,
    admin: user.admin,
  };
}

function persistenceOf(remember: boolean): Persistence {
  return remember ? "local" : "session";
}

function requireEmail(raw: string): string {
  const email = normalizeEmail(raw);
  if (!EMAIL_RE.test(email)) throw new AuthFailure("invalid-email");
  return email;
}

function requirePassword(password: string): void {
  if (password.length < MIN_PASSWORD) throw new AuthFailure("weak-password");
}

/** Bọc mọi lỗi lạ thành AuthFailure để giao diện chỉ phải xử lý một kiểu lỗi. */
async function guarded<T>(task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    if (error instanceof AuthFailure) throw error;
    throw new AuthFailure("unknown");
  }
}

export function createAuthService(backend: AuthBackend): AuthService {
  let account: AuthAccount | null = null;
  let settled = false;
  const listeners = new Set<AccountListener>();
  let resolveReady!: (value: AuthAccount | null) => void;
  const ready = new Promise<AuthAccount | null>((resolve) => {
    resolveReady = resolve;
  });

  const apply = (user: BackendUser | null): AuthAccount | null => {
    account = user ? toAccount(user) : null;
    return account;
  };

  backend.subscribe((user) => {
    const next = apply(user);
    if (!settled) {
      settled = true;
      resolveReady(next);
    }
    listeners.forEach((listener) => listener(next));
  });

  return {
    ready,
    isSettled: () => settled,
    current: () => account,
    isAdmin: () => account?.admin === true,

    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    register({ name, email, password, confirm, remember }) {
      return guarded(async () => {
        const cleanName = normalizeName(name);
        if (cleanName.length < NAME_MIN || cleanName.length > NAME_MAX) throw new AuthFailure("invalid-name");
        const cleanEmail = requireEmail(email);
        requirePassword(password);
        if (password !== confirm) throw new AuthFailure("password-mismatch");
        const user = await backend.signUp({ email: cleanEmail, password, name: cleanName }, persistenceOf(remember));
        return apply(user) as AuthAccount;
      });
    },

    login({ email, password, remember }) {
      return guarded(async () => {
        const cleanEmail = requireEmail(email);
        if (password.length === 0) throw new AuthFailure("invalid-credentials");
        const user = await backend.signIn({ email: cleanEmail, password }, persistenceOf(remember));
        return apply(user) as AuthAccount;
      });
    },

    loginWithGoogle(remember) {
      return guarded(async () => {
        const user = await backend.signInWithGoogle(persistenceOf(remember));
        return apply(user) as AuthAccount;
      });
    },

    requestPasswordReset(email) {
      return guarded(() => backend.sendPasswordReset(requireEmail(email)));
    },

    logout() {
      return guarded(() => backend.signOut());
    },
  };
}
