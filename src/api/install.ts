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

/** Gắn window.WindtpApi. Cần window.WindtpAuth đã có (bundle xác thực nạp trước). */
export function installApi(baseUrl: string, win: Window = window): WindtpApi {
  if (!baseUrl) throw new Error("Thiếu địa chỉ máy chủ API (WINDTP_API_URL)");
  const client = createApiClient({ baseUrl, getToken: (forceRefresh) => win.WindtpAuth.getIdToken(forceRefresh) });
  const wallet = createWalletStore(client);
  const api: WindtpApi = { baseUrl: baseUrl.replace(/\/+$/, ""), client, wallet };
  win.WindtpApi = api;
  return api;
}
