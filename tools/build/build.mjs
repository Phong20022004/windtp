// Ghép src/template.html + các file nguồn thành dist/WINDTP.html (một file HTML duy nhất)
// Dùng: node tools/build/build.mjs [--out dist/WINDTP.html]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outArg = process.argv.indexOf("--out");
const OUT = path.resolve(ROOT, outArg > 0 ? process.argv[outArg + 1] : "dist/WINDTP.html");

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const template = read("src/template.html");

const html = template.replace(/\{\{(include|include-manifest):([^}]+)\}\}/g, (_, kind, rel) => {
  if (kind === "include") return read(rel);
  // include-manifest: nối các file JS theo đúng thứ tự trong manifest (một scope JS duy nhất)
  return JSON.parse(read(rel)).map((f) => read(f)).join("");
});

if (/\{\{include/.test(html)) throw new Error("Còn placeholder chưa được thay thế");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`OK  ${path.relative(ROOT, OUT)}  ${(Buffer.byteLength(html) / 1e6).toFixed(2)} MB`);
