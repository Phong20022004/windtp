// Kiểm tra dữ liệu đề thi: node tools/check-exam-data.mjs [file ...]  (mặc định: mọi file exam-data*.js theo manifest)
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/js/main.manifest.json"), "utf8"));
const list = manifest.filter((f) => /features\/exam-data/.test(f));
const only = process.argv.slice(2);
const files = only.length ? [list.find((f) => /exam-data-zh-lib/.test(f)), ...only].filter(Boolean) : list;
const ctx = { EXAM_PAPERS: [] };
vm.createContext(ctx);
let src = "";
for (const f of files) src += "\n" + fs.readFileSync(path.isAbsolute(f) ? f : path.join(root, f), "utf8");
vm.runInContext("(function(){" + src + "\n;this.__P=EXAM_PAPERS;}).call(this)", ctx);
const papers = ctx.__P;
const errs = [];
const ids = new Set();
for (const p of papers) {
  if (ids.has(p.id)) errs.push("trùng id " + p.id);
  ids.add(p.id);
  if (!p.items.length) errs.push(p.id + ": không có câu");
  if (p.audio && !fs.existsSync(path.join(root, "src", p.audio))) errs.push(p.id + ": thiếu file audio " + p.audio);
  const seen = new Set();
  p.items.forEach((it, k) => {
    const w = p.id + " #" + (k + 1) + (it.n ? " (câu " + it.n + ")" : "");
    if (it.n !== undefined) { if (seen.has(it.n)) errs.push(w + ": trùng số câu"); seen.add(it.n); }
    if (!it.q) errs.push(w + ": thiếu đề");
    if (it.img && !fs.existsSync(path.join(root, "src", it.img))) errs.push(w + ": thiếu file ảnh " + it.img);
    if (it.opts) {
      if (it.opts.length < 2 || it.opts.some((o) => !String(o).trim())) errs.push(w + ": đáp án rỗng");
      if (!(it.a >= 0 && it.a < it.opts.length)) errs.push(w + ": đáp án đúng ngoài phạm vi");
      if (new Set(it.opts).size !== it.opts.length) errs.push(w + ": đáp án trùng nhau");
    } else if (it.blanks) {
      if (!it.blanks.every((b) => b.length)) errs.push(w + ": chỗ trống không có đáp án");
    } else if (it.text) {
      if (!it.text.length) errs.push(w + ": thiếu đáp án");
    } else errs.push(w + ": không có kiểu đáp án");
    if (it.speak !== undefined && !it.speak) errs.push(w + ": kịch bản nghe rỗng");
  });
}
console.log(papers.length + " đề, " + papers.reduce((a, p) => a + p.items.length, 0) + " câu");
if (errs.length) { console.log(errs.join("\n")); process.exit(1); }
console.log("Dữ liệu đề hợp lệ");
