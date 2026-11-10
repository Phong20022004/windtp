import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { computeDailyExtras, loadBaseTerms } from "../../tools/build/vocab-data";
import { LANG_CODES, type VocabFile, type VocabRow } from "../../src/data/types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Dựng VocabFile từ các khóa và danh sách dòng. */
function vocab(entries: Record<string, VocabRow[]>): VocabFile {
  return Object.fromEntries(Object.entries(entries).map(([key, rows]) => [key, [[1, rows]]])) as VocabFile;
}

const word = (term: string, reading = "r", pos = "n", meaning = "m", example = "e", exampleVi = "v"): VocabRow => [term, reading, pos, meaning, example, exampleVi];

function many(prefix: string, count: number): VocabRow[] {
  return Array.from({ length: count }, (_, i) => word(`${prefix}${i}`));
}

describe("computeDailyExtras: lọc từ", () => {
  it("bỏ từ không có ví dụ, từ trùng (không phân biệt hoa thường) và từ trùng với từ gốc", () => {
    const result = computeDailyExtras("en", ["Base"], vocab({ "A|0": [word("Alpha"), word("alpha"), word("base"), word("noexample", "r", "n", "m", ""), word("Beta")] }));
    assert.deepEqual(result.vocab.map((w) => w.term).sort(), ["Alpha", "Beta"]);
  });

  it("tiếng Tây Ban Nha cần có nghĩa tiếng Việt (cột 5)", () => {
    const rows = [word("hola", "r", "n", "m", "e", "xin chào"), word("adios", "r", "n", "m", "e", "")];
    assert.deepEqual(computeDailyExtras("es", [], vocab({ "A|0": rows })).vocab.map((w) => w.term), ["hola"]);
    assert.equal(computeDailyExtras("en", [], vocab({ "A|0": rows })).vocab.length, 2, "ngôn ngữ khác không đòi hỏi cột 5");
  });

  it("tiếng Hàn: bỏ mục ngữ pháp và mục thiếu nghĩa trong Yonsei Reading", () => {
    const rows = [word("가다", "r", "Động từ", "m", "e", "v"), word("문법", "r", "Ngữ pháp", "m", "e", "v"), word("공백", "r", "n", "m", "e", "")];
    assert.deepEqual(computeDailyExtras("ko", [], vocab({ "Yonsei Reading / Listening|0": rows })).vocab.map((w) => w.term), ["가다"]);
    assert.equal(computeDailyExtras("ko", [], vocab({ "Yonsei Tổng hợp|0": rows })).vocab.length, 3, "quy tắc chỉ áp dụng cho Yonsei Reading");
  });

  it("tiếng Pháp: bỏ loại từ bắt đầu bằng 'câu'", () => {
    const rows = [word("bonjour", "r", "interj", "m", "e", "v"), word("ça va", "r", "Câu giao tiếp", "m", "e", "v")];
    assert.deepEqual(computeDailyExtras("fr", [], vocab({ "A|0": rows })).vocab.map((w) => w.term), ["bonjour"]);
  });

  it("tiếng Trung: chỉ nhận từ gồm toàn chữ Hán", () => {
    const rows = [word("你好"), word("hello"), word("你好a")];
    assert.deepEqual(computeDailyExtras("zh", [], vocab({ "A|0": rows })).vocab.map((w) => w.term), ["你好"]);
  });
});

describe("computeDailyExtras: ngữ pháp", () => {
  const rows: VocabRow[] = [["A", "B", "x", "giải thích", "ví dụ", "dịch"], ["C", "D", "x", "gt", "", "dịch"]];
  const file = vocab({ "Cấu trúc ngữ pháp|0": rows });

  it("chỉ lấy dòng có ví dụ và không đưa vào danh sách từ", () => {
    const result = computeDailyExtras("en", [], file);
    assert.equal(result.vocab.length, 0);
    assert.deepEqual(result.grammar, [{ title: "A", pattern: "A", explain: "giải thích", example: "ví dụ", exampleVi: "dịch" }]);
  });

  it("tiêu đề và mẫu câu đổi theo ngôn ngữ", () => {
    assert.equal(computeDailyExtras("de", [], file).grammar[0]?.title, "B");
    assert.equal(computeDailyExtras("es", [], file).grammar[0]?.pattern, "A  ≈  B");
    assert.equal(computeDailyExtras("fr", [], file).grammar[0]?.pattern, "B");
  });
});

describe("computeDailyExtras: xáo trộn và cắt", () => {
  const file = vocab({ "A|0": many("w", 5000) });

  it("xác định (cùng đầu vào cho cùng kết quả) và là hoán vị của tập từ", () => {
    const first = computeDailyExtras("en", [], file);
    const second = computeDailyExtras("en", [], file);
    assert.deepEqual(first, second);
    const order = first.vocab.map((w) => Number((w.term ?? "").slice(1)));
    assert.notDeepEqual(order.slice(0, 20), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], "phải được xáo trộn");
    assert.equal(new Set(order).size, order.length, "không lặp từ");
  });

  it("cắt 2000 từ, riêng tiếng Tây Ban Nha 3000", () => {
    assert.equal(computeDailyExtras("en", [], file).vocab.length, 2000);
    assert.equal(computeDailyExtras("es", [], vocab({ "A|0": many("w", 5000).map((r) => [...r.slice(0, 5), "v"]) })).vocab.length, 3000);
  });

  it("seed riêng từng ngôn ngữ nên thứ tự khác nhau", () => {
    const en = computeDailyExtras("en", [], file).vocab.map((w) => w.term);
    const zh = computeDailyExtras("ko", [], file).vocab.map((w) => w.term);
    assert.notDeepEqual(en.slice(0, 50), zh.slice(0, 50));
  });

  it("trả mảng ít hơn giới hạn nguyên vẹn khi tập từ nhỏ", () => {
    const result = computeDailyExtras("en", [], vocab({ "A|0": many("w", 3) }));
    assert.equal(result.vocab.length, 3);
  });
});

describe("loadBaseTerms (đọc dữ liệu thật của dự án)", () => {
  it("lấy được từ vựng gốc của đủ 7 ngôn ngữ", () => {
    const terms = loadBaseTerms(ROOT);
    for (const code of LANG_CODES) {
      assert.ok((terms[code]?.length ?? 0) > 0, `thiếu từ gốc của ${code}`);
      assert.ok(terms[code]?.every((term) => typeof term === "string" && term.length > 0));
    }
  });

  it("báo lỗi rõ ràng khi cấu trúc file nguồn không như mong đợi", () => {
    assert.throws(() => loadBaseTerms(path.join(ROOT, "tests")), /ENOENT|Không tìm thấy/);
  });
});
