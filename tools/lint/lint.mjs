// Kiểm tra phần JS giao diện: các file trong main.manifest.json được nối thành một scope (như khi build) rồi chạy ESLint
// để bắt biến chưa khai báo, khai báo trùng, mã không chạm tới được, so sánh sai kiểu... Thoát mã 1 nếu có lỗi.
import { ESLint } from "eslint";
import globals from "globals";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const files = JSON.parse(fs.readFileSync(path.join(root, "src/js/main.manifest.json"), "utf8"));
const code = files.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("");
// Nơi từng dòng của file nối thuộc về, để báo lỗi chỉ ra file thật.
const starts = [];
let line = 1;
for (const f of files) { starts.push({ line, f }); line += fs.readFileSync(path.join(root, f), "utf8").split("\n").length - 1; }
const where = (n) => { let hit = starts[0]; for (const s of starts) if (s.line <= n) hit = s; return `${hit.f}:${n - hit.line + 1}`; };

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [{
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { ...globals.browser } },
    rules: {
      "no-undef": "error", "no-redeclare": "error", "no-dupe-keys": "error", "no-dupe-args": "error", "no-unreachable": "error",
      "no-self-assign": "error", "no-unsafe-negation": "error", "use-isnan": "error", "valid-typeof": "error",
      "no-const-assign": "error", "no-dupe-else-if": "error", "no-duplicate-case": "error",
      "no-unsafe-finally": "error", "no-sparse-arrays": "error", "no-cond-assign": ["error", "except-parens"],
    },
  }],
});
const [res] = await eslint.lintText(code, { filePath: path.join(root, "dist/__bundle.js") });
for (const m of res.messages) console.log(`${where(m.line)}  ${m.ruleId ?? "lỗi cú pháp"}  ${m.message}`);
console.log(res.messages.length ? `\nESLint: ${res.messages.length} lỗi` : "ESLint: sạch");
process.exit(res.messages.length ? 1 : 0);
