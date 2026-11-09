// Ghép src/template.html + các file nguồn thành dist/WINDTP.html (một file HTML duy nhất)
// Dùng: tsx tools/build/build.ts [--out dist/WINDTP.html] [--test-auth]
//   --test-auth  dùng backend xác thực giả (tests/fake-auth) thay cho Firebase; chỉ để chạy kiểm thử.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const flagValue = (name: string): string | undefined => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const testAuth = args.includes("--test-auth");
const OUT = path.resolve(ROOT, flagValue("--out") ?? "dist/WINDTP.html");

const FIREBASE_ENTRY = "src/auth/entry-firebase.ts";
const FAKE_ENTRY = "tests/fake-auth/entry.ts";

const read = (p: string): string => fs.readFileSync(path.join(ROOT, p), "utf8");

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

function bundleTs(rel: string): string {
  const actual = testAuth && rel === FIREBASE_ENTRY ? FAKE_ENTRY : rel;
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

const template = read("src/template.html");

const html = template.replace(/\{\{(include|include-manifest|include-bundle):([^}]+)\}\}/g, (_match, kind: string, rel: string) => {
  if (kind === "include") return read(rel);
  if (kind === "include-bundle") return bundleTs(rel);
  // include-manifest: nối các file JS theo đúng thứ tự trong manifest (một scope JS duy nhất)
  return (JSON.parse(read(rel)) as string[]).map((f) => read(f)).join("");
});

if (/\{\{include/.test(html)) throw new Error("Còn placeholder chưa được thay thế");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`OK  ${path.relative(ROOT, OUT)}  ${(Buffer.byteLength(html) / 1e6).toFixed(2)} MB${testAuth ? "  (backend xác thực giả, chỉ để test)" : ""}`);
