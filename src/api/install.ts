import { createApiClient, type ApiClient } from "./client";
import { createWalletStore, type WalletStore } from "./wallet";

export interface WindtpApi {
  /** Gốc địa chỉ máy chủ, không có dấu / cuối (dùng ghép địa chỉ ảnh). */
  baseUrl: string;
  client: ApiClient;
  wallet: WalletStore;
  /** Quên khóa phiên (gọi khi đăng xuất). */
  clearSession: () => void;
}

declare global {
  interface Window {
    /** Máy chủ ví và API dùng chung cho toàn bộ app (src/js/features/economy-api.js). */
    WindtpApi: WindtpApi;
  }
}

const DEVICE_KEY = "windtp-device";
let memoryDeviceId = "";

/** Mã thiết bị: tạo một lần, giữ trong localStorage. Xóa dữ liệu trình duyệt sẽ tạo mã mới (chiếm thêm một chỗ cho tới khi gỡ). */
export function deviceId(win: Window = window): string {
  try {
    const saved = win.localStorage.getItem(DEVICE_KEY);
    if (saved && /^[A-Za-z0-9_-]{16,64}$/.test(saved)) return saved;
  } catch { /* bị chặn lưu trữ: dùng mã trong bộ nhớ */ }
  if (!memoryDeviceId) {
    const bytes = win.crypto.getRandomValues(new Uint8Array(18));
    memoryDeviceId = "d" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  try { win.localStorage.setItem(DEVICE_KEY, memoryDeviceId); } catch { /* không lưu được */ }
  return memoryDeviceId;
}

const SESSION_KEY = "windtp-skey";
let memorySessionKey = "";
/** Khóa phiên do máy chủ cấp; giữ ở localStorage (dùng chung các tab của cùng trình duyệt), có bản dự phòng trong bộ nhớ. */
export function sessionStore(win: Window = window): { get: () => string; set: (key: string) => void; clear: () => void } {
  return {
    get: () => {
      try { const saved = win.localStorage.getItem(SESSION_KEY); if (saved) return saved; } catch { /* dùng bộ nhớ */ }
      return memorySessionKey;
    },
    set: (key) => {
      memorySessionKey = key;
      try { win.localStorage.setItem(SESSION_KEY, key); } catch { /* không lưu được */ }
    },
    clear: () => {
      memorySessionKey = "";
      try { win.localStorage.removeItem(SESSION_KEY); } catch { /* không lưu được */ }
    },
  };
}

/** Gắn window.WindtpApi. Cần window.WindtpAuth đã có (bundle xác thực nạp trước). */
export function installApi(baseUrl: string, win: Window = window): WindtpApi {
  if (!baseUrl) throw new Error("Thiếu địa chỉ máy chủ API (WINDTP_API_URL)");
  const session = sessionStore(win);
  const client = createApiClient({ baseUrl, getToken: (forceRefresh) => win.WindtpAuth.getIdToken(forceRefresh), getDeviceId: () => deviceId(win), session });
  const wallet = createWalletStore(client);
  const api: WindtpApi = { baseUrl: baseUrl.replace(/\/+$/, ""), client, wallet, clearSession: session.clear };
  win.WindtpApi = api;
  return api;
}
