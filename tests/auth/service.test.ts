import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAuthService } from "../../src/auth/service";
import { AuthFailure, type AuthBackend, type AuthErrorCode, type BackendUser, type Persistence } from "../../src/auth/types";

type Listener = (user: BackendUser | null) => void;

interface Calls {
  signUp: Array<{ email: string; name: string; persistence: Persistence }>;
  signIn: Array<{ email: string; persistence: Persistence }>;
  resets: string[];
  signOuts: number;
}

function user(overrides: Partial<BackendUser> = {}): BackendUser {
  return { uid: "u1", email: "An@Example.com", displayName: "An", emailVerified: false, admin: false, ...overrides };
}

class StubBackend implements AuthBackend {
  listener: Listener = () => undefined;
  readonly calls: Calls = { signUp: [], signIn: [], resets: [], signOuts: 0 };
  failWith: Error | null = null;

  constructor(private initial: BackendUser | null = null) {}

  subscribe(listener: Listener): () => void {
    this.listener = listener;
    listener(this.initial);
    return () => undefined;
  }

  async signUp(input: { email: string; password: string; name: string }, persistence: Persistence): Promise<BackendUser> {
    if (this.failWith) throw this.failWith;
    this.calls.signUp.push({ email: input.email, name: input.name, persistence });
    return user({ email: input.email, displayName: input.name });
  }

  async signIn(input: { email: string; password: string }, persistence: Persistence): Promise<BackendUser> {
    if (this.failWith) throw this.failWith;
    this.calls.signIn.push({ email: input.email, persistence });
    return user({ email: input.email });
  }

  async signInWithGoogle(): Promise<BackendUser> {
    return user({ email: "g@gmail.com", displayName: "" });
  }

  async sendPasswordReset(email: string): Promise<void> {
    this.calls.resets.push(email);
  }

  tokenCalls: boolean[] = [];
  tokenFails = false;

  async getIdToken(forceRefresh = false): Promise<string | null> {
    this.tokenCalls.push(forceRefresh);
    if (this.tokenFails) throw new Error("offline");
    return "tok";
  }

  async signOut(): Promise<void> {
    this.calls.signOuts += 1;
  }
}

async function rejectsWith(promise: Promise<unknown>, code: AuthErrorCode): Promise<void> {
  await assert.rejects(promise, (error: unknown) => error instanceof AuthFailure && error.code === code && error.message.length > 0);
}

const goodRegister = { name: "Nguyễn Văn A", email: "a@b.vn", password: "secret1", confirm: "secret1", remember: true };

describe("register", () => {
  it("từ chối tên quá ngắn hoặc quá dài mà không gọi backend", async () => {
    const backend = new StubBackend();
    const auth = createAuthService(backend);
    await rejectsWith(auth.register({ ...goodRegister, name: " A " }), "invalid-name");
    await rejectsWith(auth.register({ ...goodRegister, name: "x".repeat(31) }), "invalid-name");
    assert.equal(backend.calls.signUp.length, 0);
  });

  it("từ chối email sai định dạng, mật khẩu ngắn và xác nhận không khớp", async () => {
    const auth = createAuthService(new StubBackend());
    await rejectsWith(auth.register({ ...goodRegister, email: "khong-phai-email" }), "invalid-email");
    await rejectsWith(auth.register({ ...goodRegister, password: "12345", confirm: "12345" }), "weak-password");
    await rejectsWith(auth.register({ ...goodRegister, confirm: "secret2" }), "password-mismatch");
  });

  it("chuẩn hóa tên và email, chọn persistence theo remember", async () => {
    const backend = new StubBackend();
    const auth = createAuthService(backend);
    const account = await auth.register({ ...goodRegister, name: "  Nguyễn   Văn A ", email: "  A@B.vn ", remember: false });
    assert.deepEqual(backend.calls.signUp, [{ email: "a@b.vn", name: "Nguyễn Văn A", persistence: "session" }]);
    assert.equal(account.email, "a@b.vn");
    assert.equal(account.name, "Nguyễn Văn A");
    assert.equal(auth.current()?.email, "a@b.vn");
  });

  it("bọc lỗi lạ của backend thành AuthFailure unknown", async () => {
    const backend = new StubBackend();
    backend.failWith = new Error("boom");
    await rejectsWith(createAuthService(backend).register(goodRegister), "unknown");
  });

  it("giữ nguyên mã lỗi AuthFailure từ backend", async () => {
    const backend = new StubBackend();
    backend.failWith = new AuthFailure("email-in-use");
    await rejectsWith(createAuthService(backend).register(goodRegister), "email-in-use");
  });
});

describe("login", () => {
  it("kiểm tra email và mật khẩu rỗng trước khi gọi backend", async () => {
    const backend = new StubBackend();
    const auth = createAuthService(backend);
    await rejectsWith(auth.login({ email: "ten-dang-nhap", password: "x", remember: false }), "invalid-email");
    await rejectsWith(auth.login({ email: "a@b.vn", password: "", remember: false }), "invalid-credentials");
    assert.equal(backend.calls.signIn.length, 0);
  });

  it("đăng nhập thành công và trả về tài khoản chuẩn hóa", async () => {
    const backend = new StubBackend();
    const auth = createAuthService(backend);
    const account = await auth.login({ email: "A@B.vn", password: "secret1", remember: true });
    assert.deepEqual(backend.calls.signIn, [{ email: "a@b.vn", persistence: "local" }]);
    assert.equal(account.admin, false);
  });

  it("Google: lấy tên từ phần trước @ khi hồ sơ không có tên", async () => {
    const account = await createAuthService(new StubBackend()).loginWithGoogle(true);
    assert.equal(account.name, "g");
    assert.equal(account.email, "g@gmail.com");
  });
});

describe("trạng thái phiên", () => {
  it("ready resolve null khi chưa đăng nhập và isSettled chuyển true", async () => {
    const auth = createAuthService(new StubBackend(null));
    assert.equal(await auth.ready, null);
    assert.equal(auth.isSettled(), true);
    assert.equal(auth.current(), null);
    assert.equal(auth.isAdmin(), false);
  });

  it("khôi phục phiên có sẵn và đọc cờ admin từ backend", async () => {
    const auth = createAuthService(new StubBackend(user({ admin: true })));
    const account = await auth.ready;
    assert.equal(account?.admin, true);
    assert.equal(auth.isAdmin(), true);
  });

  it("thông báo cho người nghe khi claim admin bị thu hồi, và hủy đăng ký hoạt động", async () => {
    const backend = new StubBackend(user({ admin: true }));
    const auth = createAuthService(backend);
    await auth.ready;
    const seen: Array<boolean | null> = [];
    const off = auth.onChange((account) => seen.push(account ? account.admin : null));
    backend.listener(user({ admin: false }));
    assert.equal(auth.isAdmin(), false);
    off();
    backend.listener(null);
    assert.deepEqual(seen, [false]);
    assert.equal(auth.current(), null);
  });

  it("logout gọi backend và đặt lại mật khẩu kiểm tra email", async () => {
    const backend = new StubBackend(user());
    const auth = createAuthService(backend);
    await auth.logout();
    assert.equal(backend.calls.signOuts, 1);
    await rejectsWith(auth.requestPasswordReset("sai"), "invalid-email");
    await auth.requestPasswordReset(" A@B.vn ");
    assert.deepEqual(backend.calls.resets, ["a@b.vn"]);
  });
});

describe("getIdToken", () => {
  it("trả null khi chưa đăng nhập và không hỏi backend", async () => {
    const backend = new StubBackend(null);
    const auth = createAuthService(backend);
    await auth.ready;
    assert.equal(await auth.getIdToken(), null);
    assert.deepEqual(backend.tokenCalls, []);
  });

  it("chuyển cờ làm mới xuống backend", async () => {
    const backend = new StubBackend(user());
    const auth = createAuthService(backend);
    await auth.ready;
    assert.equal(await auth.getIdToken(), "tok");
    assert.equal(await auth.getIdToken(true), "tok");
    assert.deepEqual(backend.tokenCalls, [false, true]);
  });

  it("mất mạng khi lấy token thì trả null thay vì ném lỗi", async () => {
    const backend = new StubBackend(user());
    const auth = createAuthService(backend);
    await auth.ready;
    backend.tokenFails = true;
    assert.equal(await auth.getIdToken(), null);
  });
});
