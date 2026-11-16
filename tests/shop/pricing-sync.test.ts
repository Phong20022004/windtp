import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, it } from "node:test";
// @ts-expect-error bảng giá máy chủ viết bằng JS thuần
import { builtinProduct, LANG_CODES } from "../../worker/src/shop.js";

type ClientProduct = { id: string; price: { VND: number; KRW: number; JPY: number; TWD: number }; plan?: string; lang?: string; docOf?: string };

/** Lấy danh sách sản phẩm có sẵn thật sự mà trình duyệt hiển thị, bằng cách chạy đúng đoạn mã tạo ra nó. */
function clientProducts(): { products: ClientProduct[]; langs: string[]; plans: Array<{ id: string; months: number; chips: number; life?: boolean }> } {
  const src = readFileSync("src/js/core/languages-and-helpers.js", "utf8");
  const langStart = src.indexOf("var LANGUAGES = [");
  const langs = [...src.slice(langStart, src.indexOf("var DOC_PRICE")).matchAll(/^ {6}code: "([a-z-]+)"/gm)].map((m) => m[1] ?? "");
  const from = src.indexOf("var DOC_PRICE");
  const to = src.indexOf("var PRODUCTS = courseProducts();");
  assert.ok(from > 0 && to > from, "không tìm thấy đoạn tạo sản phẩm");
  const code = `var LANGUAGES = ${JSON.stringify(langs.map((c) => ({ code: c, name: c, flag: "" })))};\n${src.slice(from, to)}\n__out = { products: courseProducts(), plans: COURSE_PLANS };`;
  const ctx: { __out?: unknown } = {};
  vm.runInNewContext(code, ctx);
  return { ...(ctx.__out as { products: ClientProduct[]; plans: never[] }), langs };
}

describe("bảng giá máy chủ khớp bảng giá trình duyệt", () => {
  const { products, langs, plans } = clientProducts();
  it("cùng danh sách ngôn ngữ", () => {
    assert.deepEqual([...langs].sort(), [...LANG_CODES].sort());
  });
  it("mỗi sản phẩm có sẵn có đúng giá ở cả ba loại tiền", () => {
    assert.equal(products.length, LANG_CODES.length * 7);
    for (const p of products) {
      const s = builtinProduct(p.id);
      assert.ok(s, `máy chủ thiếu ${p.id}`);
      assert.equal(JSON.stringify(s.price), JSON.stringify(p.price), `giá lệch ở ${p.id}`);
    }
  });
  it("khóa học: số chip và số tháng khớp, trọn đời bị chặn mức tối đa", () => {
    for (const pl of plans) {
      const s = builtinProduct(`cr-en-${pl.id}`);
      assert.equal(s.planChips, pl.chips, `chip lệch ở gói ${pl.id}`);
      if (pl.life) assert.ok(s.months >= 1, "trọn đời phải có số tháng lớn");
      else assert.equal(s.months, pl.months, `số tháng lệch ở gói ${pl.id}`);
    }
  });
  it("máy chủ không có sản phẩm nào mà trình duyệt không có", () => {
    assert.equal(builtinProduct("cr-xx-1m"), null);
    assert.equal(builtinProduct("cr-en-5y"), null);
    assert.equal(builtinProduct("docm-xx"), null);
  });
});
