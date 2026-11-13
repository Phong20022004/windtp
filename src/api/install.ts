import { createApiClient, type ApiClient } from "./client";
import { createWalletStore, type WalletStore } from "./wallet";

export interface WindtpApi {
  /** Gốc địa chỉ máy chủ, không có dấu / cuối (dùng ghép địa chỉ ảnh). */
  baseUrl: string;
  client: ApiClient;
  wallet: WalletStore;
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

/** Gắn window.WindtpApi. Cần window.WindtpAuth đã có (bundle xác thực nạp trước). */
export function installApi(baseUrl: string, win: Window = window): WindtpApi {
  if (!baseUrl) throw new Error("Thiếu địa chỉ máy chủ API (WINDTP_API_URL)");
  const client = createApiClient({ baseUrl, getToken: (forceRefresh) => win.WindtpAuth.getIdToken(forceRefresh), getDeviceId: () => deviceId(win) });
  const wallet = createWalletStore(client);
  const api: WindtpApi = { baseUrl: baseUrl.replace(/\/+$/, ""), client, wallet };
  win.WindtpApi = api;
  return api;
}
