import { AuthFailure, type AuthErrorCode } from "./types";

/** Đổi mã lỗi của Firebase Auth sang mã lỗi chuẩn hóa của WINDTP. */
export function mapFirebaseErrorCode(code: string): AuthErrorCode {
  switch (code) {
    case "auth/invalid-email":
      return "invalid-email";
    case "auth/email-already-in-use":
      return "email-in-use";
    case "auth/weak-password":
      return "weak-password";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "invalid-credentials";
    case "auth/user-disabled":
      return "user-disabled";
    case "auth/too-many-requests":
      return "too-many-requests";
    case "auth/network-request-failed":
      return "network";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "popup-closed";
    case "auth/popup-blocked":
      return "popup-blocked";
    default:
      return "unknown";
  }
}

export function readErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error as { code: unknown };
    if (typeof code === "string") return code;
  }
  return "";
}

export function toAuthFailure(error: unknown): AuthFailure {
  return error instanceof AuthFailure ? error : new AuthFailure(mapFirebaseErrorCode(readErrorCode(error)));
}
