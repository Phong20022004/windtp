import { createDataLoader, type DataLoader } from "./loader";
import { LANG_CODES, type DataManifest } from "./types";

declare global {
  interface Window {
    /** Bộ tải dữ liệu theo nhu cầu dùng chung cho toàn bộ app (từ vựng, bài ngày). */
    WindtpData: DataLoader;
  }
}

export const MANIFEST_ELEMENT_ID = "windtp-data-manifest";

/** Đọc và kiểm tra manifest do build nhúng vào trang; ném lỗi rõ ràng nếu thiếu hoặc thiếu ngôn ngữ. */
export function parseManifest(text: string): DataManifest {
  const parsed = JSON.parse(text) as Partial<Record<"vocab" | "daily", Record<string, unknown>>>;
  for (const kind of ["vocab", "daily"] as const) {
    for (const code of LANG_CODES) {
      if (typeof parsed[kind]?.[code] !== "string") throw new Error(`Manifest dữ liệu thiếu ${kind}/${code}`);
    }
  }
  return parsed as DataManifest;
}

export function installData(doc: Document, win: Window & typeof globalThis): DataLoader {
  const element = doc.getElementById(MANIFEST_ELEMENT_ID);
  if (!element) throw new Error(`Không thấy #${MANIFEST_ELEMENT_ID} trong trang`);
  const loader = createDataLoader({
    manifest: parseManifest(element.textContent ?? ""),
    fetchImpl: (url) => win.fetch(url, { credentials: "same-origin" }),
    baseUrl: doc.baseURI,
  });
  win.WindtpData = loader;
  // Có mạng lại thì cho phép thử tải lại ngay, không phải đợi hết thời gian chặn sau lỗi.
  win.addEventListener("online", () => loader.resetFailures());
  return loader;
}
