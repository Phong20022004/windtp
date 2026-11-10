// Sinh Content-Security-Policy cho trang: script inline và handler inline được cho phép theo băm SHA-256 thay vì 'unsafe-inline',
// nên một chỗ chèn HTML sót lại cũng không chạy được mã lạ. Băm tính từ chính HTML cuối cùng (và HTML của game nhúng qua srcdoc).
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

export const sha256Source = (text: string): string => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const NON_EXECUTABLE_TYPE_RE = /\btype\s*=\s*["']?(?:application\/(?:ld\+)?json|importmap|text\/template)/i;
/** Handler dạng onclick="__enGo()" — cả dạng nằm trong chuỗi JS (dấu nháy bị escape bằng \). */
const HANDLER_RE = /\bon[a-z]+=\\?["']([^"'\\<>]*)\\?["']/gi;

/** Nội dung các thẻ <script> inline (không có src, không phải JSON) theo đúng từng byte giữa hai thẻ. */
export function extractInlineScripts(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(SCRIPT_RE)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    if (/\bsrc\s*=/i.test(attrs) || NON_EXECUTABLE_TYPE_RE.test(attrs) || body.trim() === "") continue;
    found.push(body);
  }
  return found;
}

/** Giá trị các handler inline (onclick="..." v.v.) xuất hiện trong văn bản. */
export function extractInlineHandlers(text: string): string[] {
  return [...text.matchAll(HANDLER_RE)].map((m) => m[1] ?? "").filter((value) => value !== "");
}

/** Chạy bbl-src.js trong sandbox để lấy đúng chuỗi HTML mà ứng dụng sẽ nạp vào iframe srcdoc. */
export function loadGameHtml(root: string): string {
  const source = fs.readFileSync(path.join(root, "src/js/games/bbl-src.js"), "utf8");
  const sandbox: { window: { __BBL_HTML?: unknown } } = { window: {} };
  vm.runInNewContext(source, sandbox, { timeout: 5000 });
  const html = sandbox.window.__BBL_HTML;
  if (typeof html !== "string" || html.length === 0) throw new Error("bbl-src.js không tạo ra window.__BBL_HTML");
  return html;
}

export interface CspInput {
  /** HTML cuối cùng của trang (chứa mọi script inline cần cho phép). */
  html: string;
  /** HTML của các tài liệu nhúng bằng srcdoc (script/handler trong đó cũng nằm dưới CSP của trang cha). */
  embeddedDocs: string[];
  /** Tên miền xác thực Firebase (authDomain), có thể là miền riêng chứ không chỉ *.firebaseapp.com. */
  authDomain?: string;
}

const unique = (values: string[]): string[] => [...new Set(values)];

export function buildCsp({ html, embeddedDocs, authDomain }: CspInput): string {
  const authOrigin = authDomain ? [`https://${authDomain}`] : [];
  const docs = [html, ...embeddedDocs];
  const scriptHashes = unique(docs.flatMap((doc) => extractInlineScripts(doc)).map(sha256Source));
  const handlerHashes = unique(docs.flatMap((doc) => extractInlineHandlers(doc)).map(sha256Source));
  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", "'unsafe-hashes'", ...scriptHashes, ...handlerHashes, "https://apis.google.com", "https://www.gstatic.com", "https://cdn.jsdelivr.net"]],
    ["style-src", ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]],
    ["font-src", ["'self'", "data:", "https://fonts.gstatic.com"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["media-src", ["'self'", "data:", "blob:", "https://translate.google.com"]],
    [
      "connect-src",
      ["'self'", "data:", "blob:", "https://*.googleapis.com", "https://*.firebaseio.com", "https://*.firebaseapp.com", ...authOrigin, "https://cdn.jsdelivr.net", "https://api.mymemory.translated.net"],
    ],
    ["frame-src", ["'self'", "blob:", "https://*.firebaseapp.com", ...authOrigin, "https://accounts.google.com", "https://apis.google.com", "https://content.googleapis.com"]],
    ["worker-src", ["'self'", "blob:"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}
