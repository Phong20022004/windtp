import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

interface Item { c: string; r: string; x: string; t: string; a?: string[] }
interface Cfg { code: string; kind: string; typeMode: string; tts: string; groups: { name: string; items: Item[] }[] }
interface Data { get(code: string): Cfg | null; stripTone(s: string): string }

const ctx: { out?: Data } = {};
vm.runInNewContext(readFileSync("src/js/features/alphabet-data.js", "utf8") + "\nout = ALPHA_DATA;", ctx);
const data = ctx.out as Data;
const count = (code: string): number => (data.get(code) as Cfg).groups.reduce((n, g) => n + g.items.length, 0);

test("mọi ngôn ngữ của app đều có bộ chữ để học", () => {
  for (const code of ["en", "zh", "ja", "ko", "de", "fr", "es"]) assert.ok(data.get(code), code);
  assert.equal(data.get("vi"), null);
});

test("tiếng Trung không có bảng chữ cái nên dùng đúng 214 bộ thủ, không trùng chữ, đủ trường", () => {
  const zh = data.get("zh") as Cfg;
  assert.equal(zh.kind, "radicals");
  assert.equal(count("zh"), 214);
  const all = zh.groups.flatMap((g) => g.items);
  assert.equal(new Set(all.map((i) => i.c)).size, 214);
  const perGroup = Array.from(zh.groups.map((g) => g.items.length));
  assert.deepEqual(perGroup, [6, 23, 31, 34, 23, 29, 20, 9, 11, 8, 6, 4, 4, 2, 1, 2, 1], "số bộ thủ theo số nét theo bảng Khang Hy");
  for (const i of all) {
    assert.ok(i.r && i.x.includes("nét") && i.x.includes("ví dụ"), i.c);
    assert.ok(i.a && i.a.length === 2, i.c + " có đáp án Hán Việt và pinyin không dấu");
  }
});

test("số chữ của từng bảng chữ cái", () => {
  assert.equal(count("ko"), 40);
  assert.equal(count("ja"), 2 * (46 + 25 + 33));
  assert.equal(count("en"), 26);
  assert.equal(count("de"), 26 + 4);
  assert.equal(count("es"), 27 + 8);
  assert.ok(count("fr") >= 26 + 13);
});

test("Hangul: 14 + 5 phụ âm, 10 + 11 nguyên âm; kana: Katakana sinh đúng từ Hiragana", () => {
  const ko = data.get("ko") as Cfg;
  assert.deepEqual(Array.from(ko.groups.map((g) => g.items.length)), [14, 5, 10, 11]);
  const ja = data.get("ja") as Cfg;
  const g = ja.groups as { items: Item[] }[];
  assert.equal(g[0]!.items[0]!.c, "あ");
  assert.equal(g[3]!.items[0]!.c, "ア");
  assert.equal(g[3]!.items[45]!.c, "ン");
  assert.equal(g[4]!.items[0]!.c, "ガ");
  assert.equal(g[5]!.items[0]!.c, "キャ");
  assert.ok(g[3]!.items.every((i) => i.x), "46 katakana cơ bản đều có ví dụ");
});

test("mỗi mục có chữ, cách đọc, chữ để đọc; không trùng chữ trong cùng ngôn ngữ", () => {
  for (const code of ["en", "zh", "ja", "ko", "de", "fr", "es"]) {
    const cfg = data.get(code) as Cfg;
    const seen = new Set<string>();
    for (const g of cfg.groups) for (const i of g.items) {
      assert.ok(i.c && i.r && i.t, `${code}:${i.c}`);
      assert.ok(!seen.has(i.c), `${code} trùng ${i.c}`);
      seen.add(i.c);
    }
  }
});

test("stripTone bỏ dấu thanh của pinyin", () => {
  assert.equal(data.stripTone("nǚ"), "nv");
  assert.equal(data.stripTone("shǒu"), "shou");
});

test("Katakana: âm đục và âm ghép đều có từ ví dụ viết bằng katakana", () => {
  const ja = data.get("ja") as Cfg;
  const groups = ja.groups.filter((g) => g.name.startsWith("Katakana"));
  assert.equal(groups.length, 3);
  for (const g of groups) for (const it of g.items) assert.ok(it.x && it.x.includes(" · "), `${g.name}: ${it.c} thiếu ví dụ`);
  for (const g of groups.slice(1)) for (const it of g.items) {
    const word = (it.x as string).split(" · ")[0] as string;
    assert.ok(/[゠-ヿ]/.test(word), `${it.c}: ví dụ "${word}" phải chứa katakana`);
  }
});
