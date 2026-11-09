import { createAuthService } from "./service";
import type { AuthBackend, AuthService } from "./types";

declare global {
  interface Window {
    /** Dịch vụ xác thực dùng chung cho toàn bộ app (src/js/features/login-admin.js). */
    WindtpAuth: AuthService;
  }
}

export function installAuth(backend: AuthBackend): AuthService {
  const service = createAuthService(backend);
  window.WindtpAuth = service;
  return service;
}
