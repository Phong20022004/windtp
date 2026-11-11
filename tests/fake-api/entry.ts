import { installApi } from "../../src/api/install";

declare global {
  interface Window {
    /** Test trình duyệt gán địa chỉ máy chủ API chạy cục bộ trước khi trang nạp (Playwright add_init_script). */
    __WINDTP_API_URL__?: string;
  }
}

installApi(window.__WINDTP_API_URL__ ?? "http://127.0.0.1:0");
