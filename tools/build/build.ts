// Ghép src/template.html + các file nguồn thành trang HTML, kèm thư mục data/ và assets/ đặt cạnh trang.
// Dùng: tsx tools/build/build.ts [--out dist/index.html] [--test-auth]
//   --test-auth  dùng backend xác thực giả (tests/fake-auth) thay cho Firebase; chỉ để chạy kiểm thử.
// Tên file trong data/ và assets/ chứa băm nội dung nên có thể cache vô thời hạn; hai bản build (production và test) dùng chung thư mục.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { LANG_CODES, type DataManifest, type LangCode, type VocabFile } from "../../src/data/types";
import { contentHash, extractDataUris, type ExtractedAsset } from "./assets";
import { buildCsp, loadGameHtml } from "./csp";
import { computeDailyExtras, loadBaseTerms } from "./vocab-data";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const flagValue = (name: string): string | undefined => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const testAuth = args.includes("--test-auth");
const OUT = path.resolve(ROOT, flagValue("--out") ?? "dist/index.html");
const OUT_DIR = path.dirname(OUT);

const FIREBASE_ENTRY = "src/auth/entry-firebase.ts";
const FAKE_ENTRY = "tests/fake-auth/entry.ts";
const API_ENTRY = "src/api/entry.ts";
const FAKE_API_ENTRY = "tests/fake-api/entry.ts";

/**
 * Chỉ tách ảnh nhúng ở các file đã kiểm tra là chỉ dùng ảnh làm `src`/`url()`.
 * Không tách embedded-shop-data.js (có code kiểm tra `data:` của ảnh sản phẩm) và bbl-src.js (có chuỗi chạy trong Worker blob).
 */
const ASSET_FILES: ReadonlySet<string> = new Set([
  "src/js/core/embedded-images.js",
  "src/js/players/seoul1a-lesson1.js",
  "src/css/game/bbl-art.css",
]);
const ASSET_MIN_BYTES = 2048;

const assets = new Map<string, ExtractedAsset>();
const dataFiles = new Map<string, string>();

const readRaw = (p: string): string => fs.readFileSync(path.join(ROOT, p), "utf8");
const read = (p: string): string => (ASSET_FILES.has(p) ? extractDataUris(readRaw(p), ASSET_MIN_BYTES, assets) : readRaw(p));

/** Cấu hình web của Firebase (công khai theo thiết kế): ưu tiên biến môi trường, sau đó firebase.config.json. */
function loadFirebaseConfig(): Record<string, string> {
  const fromEnv = process.env.WINDTP_FIREBASE_CONFIG;
  const file = path.join(ROOT, "firebase.config.json");
  const raw = fromEnv ?? (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined);
  if (raw === undefined) {
    throw new Error(
      "Thiếu cấu hình Firebase. Đặt biến môi trường WINDTP_FIREBASE_CONFIG (JSON) hoặc tạo firebase.config.json ở thư mục gốc " +
        "(xem README, mục 'Cấu hình Firebase').",
    );
  }
  const config = JSON.parse(raw) as Record<string, unknown>;
  for (const key of ["apiKey", "authDomain", "projectId", "appId"]) {
    if (typeof config[key] !== "string" || config[key] === "") throw new Error(`Cấu hình Firebase thiếu trường "${key}"`);
  }
  return config as Record<string, string>;
}

/**
 * Địa chỉ gốc của máy chủ ví (Cloudflare Worker): biến môi trường WINDTP_API_URL hoặc api.config.json {"url": "..."}.
 * Bản test dùng máy chủ cục bộ do test dựng, địa chỉ được gán lúc chạy nên không cần cấu hình.
 */
function loadApiUrl(): string {
  if (testAuth) return "";
  const file = path.join(ROOT, "api.config.json");
  const fromFile = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as { url?: unknown }).url : undefined;
  const raw = process.env.WINDTP_API_URL ?? (typeof fromFile === "string" ? fromFile : undefined);
  if (raw === undefined) {
    throw new Error("Thiếu địa chỉ máy chủ API. Đặt biến môi trường WINDTP_API_URL hoặc tạo api.config.json ({\"url\": \"https://...\"}), xem worker/README.md.");
  }
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("WINDTP_API_URL phải dùng https");
  return url.origin;
}

function bundleTs(rel: string): string {
  const actual = testAuth && rel === FIREBASE_ENTRY ? FAKE_ENTRY : testAuth && rel === API_ENTRY ? FAKE_API_ENTRY : rel;
  const result = buildSync({
    entryPoints: [path.join(ROOT, actual)],
    bundle: true,
    write: false,
    format: "iife",
    target: "es2020",
    minify: !testAuth,
    legalComments: "none",
    define: actual === FIREBASE_ENTRY ? { __FIREBASE_CONFIG__: JSON.stringify(loadFirebaseConfig()) } : {},
  });
  const file = result.outputFiles?.[0];
  if (!file) throw new Error(`esbuild không tạo ra đầu ra cho ${rel}`);
  // Tránh đóng thẻ <script> sớm nếu bundle có chuỗi "</script".
  return file.text.replace(/<\/script/gi, "<\\/script");
}

/** Xuất từ vựng đầy đủ và phần bổ sung bài ngày của từng ngôn ngữ thành file riêng, trả về manifest. */
function buildDataFiles(): DataManifest {
  const baseTerms = loadBaseTerms(ROOT);
  const manifest = { vocab: {}, daily: {} } as { vocab: Partial<Record<LangCode, string>>; daily: Partial<Record<LangCode, string>> };
  for (const code of LANG_CODES) {
    const vocabText = readRaw(`data/vocab/${code}.json`);
    const vocabPath = `data/vocab.${code}.${contentHash(vocabText)}.json`;
    dataFiles.set(vocabPath, vocabText);
    manifest.vocab[code] = vocabPath;

    const daily = JSON.stringify(computeDailyExtras(code, baseTerms[code], JSON.parse(vocabText) as VocabFile));
    const dailyPath = `data/daily.${code}.${contentHash(daily)}.json`;
    dataFiles.set(dailyPath, daily);
    manifest.daily[code] = dailyPath;
  }
  return manifest as DataManifest;
}

/** Ghi file mới và xóa file cũ không còn được tham chiếu trong data/ và assets/ (tên đã băm nên không ghi đè nhầm). */
function writeOutputs(html: string): { dataBytes: number; assetBytes: number } {
  const wanted = new Set<string>([...dataFiles.keys(), ...assets.keys()]);
  let dataBytes = 0;
  let assetBytes = 0;

  const put = (rel: string, content: string | Buffer): void => {
    const target = path.join(OUT_DIR, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.writeFileSync(target, content);
  };
  for (const [rel, content] of dataFiles) {
    put(rel, content);
    dataBytes += Buffer.byteLength(content);
  }
  for (const [rel, asset] of assets) {
    put(rel, asset.data);
    assetBytes += asset.data.length;
  }

  for (const folder of ["data", "assets"]) {
    const dir = path.join(OUT_DIR, folder);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!wanted.has(`${folder}/${name}`)) fs.rmSync(path.join(dir, name), { force: true });
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, html);
  return { dataBytes, assetBytes };
}

const manifest = buildDataFiles();
const template = read("src/template.html");

const apiUrl = loadApiUrl();
const assembled = template
  .replace("{{api-url}}", apiUrl)
  .replace("{{data-manifest}}", JSON.stringify(manifest))
  .replace(/\{\{(include|include-manifest|include-bundle):([^}]+)\}\}/g, (_match, kind: string, rel: string) => {
    if (kind === "include") return read(rel);
    if (kind === "include-bundle") return bundleTs(rel);
    // include-manifest: nối các file JS theo đúng thứ tự trong manifest (một scope JS duy nhất)
    return (JSON.parse(read(rel)) as string[]).map((f) => read(f)).join("");
  });

// CSP tính sau cùng, từ chính HTML đã ghép (thẻ meta nằm ngoài mọi script nên không làm đổi băm).
const csp = buildCsp({ html: assembled, embeddedDocs: [loadGameHtml(ROOT)], authDomain: testAuth ? undefined : loadFirebaseConfig().authDomain, apiOrigin: apiUrl || undefined, allowLocalApi: testAuth });
const html = assembled.replace("{{csp}}", () => csp);

if (/\{\{(include|data-manifest|csp|api-url)/.test(html)) throw new Error("Còn placeholder chưa được thay thế");

const { dataBytes, assetBytes } = writeOutputs(html);
const mb = (bytes: number): string => (bytes / 1e6).toFixed(2);
console.log(
  `OK  ${path.relative(ROOT, OUT)}  ${mb(Buffer.byteLength(html))} MB  |  data/ ${mb(dataBytes)} MB (${dataFiles.size} file)  |  assets/ ${mb(assetBytes)} MB (${assets.size} file)` +
    (testAuth ? "  |  backend xác thực giả, chỉ để test" : ""),
);
