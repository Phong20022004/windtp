/** Tài khoản đã được máy chủ xác thực (không bao giờ đọc từ localStorage). */
export interface AuthAccount {
  uid: string;
  email: string;
  name: string;
  emailVerified: boolean;
  /** Lấy từ custom claim `admin` trong ID token do Firebase ký. */
  admin: boolean;
}

export type AuthErrorCode =
  | "invalid-name"
  | "invalid-email"
  | "weak-password"
  | "password-mismatch"
  | "invalid-credentials"
  | "email-in-use"
  | "user-disabled"
  | "too-many-requests"
  | "network"
  | "popup-closed"
  | "popup-blocked"
  | "unknown";

/** Lỗi xác thực đã chuẩn hóa; `message` là tiếng Việt, hiển thị thẳng cho người dùng. */
export class AuthFailure extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(AUTH_MESSAGES[code]);
    this.name = "AuthFailure";
    this.code = code;
  }
}

export const AUTH_MESSAGES: Readonly<Record<AuthErrorCode, string>> = {
  "invalid-name": "Vui lòng nhập họ và tên (2–30 ký tự)",
  "invalid-email": "Email chưa hợp lệ",
  "weak-password": "Mật khẩu tối thiểu 6 ký tự",
  "password-mismatch": "Mật khẩu xác nhận chưa khớp",
  "invalid-credentials": "Sai email hoặc mật khẩu",
  "email-in-use": "Email này đã được đăng ký, hãy đăng nhập",
  "user-disabled": "Tài khoản này đã bị vô hiệu hóa",
  "too-many-requests": "Thử quá nhiều lần, vui lòng đợi một lúc rồi thử lại",
  network: "Không kết nối được máy chủ, hãy kiểm tra mạng",
  "popup-closed": "Bạn đã đóng cửa sổ đăng nhập Google",
  "popup-blocked": "Trình duyệt đã chặn cửa sổ đăng nhập Google, hãy cho phép cửa sổ bật lên",
  unknown: "Có lỗi xảy ra, vui lòng thử lại",
};

/** Người dùng do backend trả về, đã kèm cờ admin lấy từ token. */
export interface BackendUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  admin: boolean;
}

export type Persistence = "local" | "session";

/** Hợp đồng giữa service và nhà cung cấp xác thực (Firebase thật hoặc bản giả khi test). */
export interface AuthBackend {
  /** Gọi ngay khi có người dùng (hoặc null) và mỗi khi token/claim đổi. Trả về hàm hủy đăng ký. */
  subscribe(listener: (user: BackendUser | null) => void): () => void;
  signUp(input: { email: string; password: string; name: string }, persistence: Persistence): Promise<BackendUser>;
  signIn(input: { email: string; password: string }, persistence: Persistence): Promise<BackendUser>;
  signInWithGoogle(persistence: Persistence): Promise<BackendUser>;
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
}

export type AccountListener = (account: AuthAccount | null) => void;

export interface AuthService {
  /** Resolve sau lần xác định trạng thái đăng nhập đầu tiên (đã khôi phục phiên nếu có). */
  readonly ready: Promise<AuthAccount | null>;
  /** true sau khi `ready` đã resolve; trước đó chưa nên kết luận người dùng chưa đăng nhập hay không phải admin. */
  isSettled(): boolean;
  current(): AuthAccount | null;
  isAdmin(): boolean;
  onChange(listener: AccountListener): () => void;
  register(input: { name: string; email: string; password: string; confirm: string; remember: boolean }): Promise<AuthAccount>;
  login(input: { email: string; password: string; remember: boolean }): Promise<AuthAccount>;
  loginWithGoogle(remember: boolean): Promise<AuthAccount>;
  requestPasswordReset(email: string): Promise<void>;
  logout(): Promise<void>;
}
