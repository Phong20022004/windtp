import test from "node:test";
import assert from "node:assert/strict";
import { freeVocab } from "../../tools/build/vocab-split";
import type { VocabFile } from "../../src/data/types";

const lesson = (n: number): [number, string[][]] => [n, [["từ", String(n)]]];

test("freeVocab chỉ giữ bài đầu của quyển đầu mỗi giáo trình", () => {
  const full: VocabFile = { "A|0": [lesson(1), lesson(2), lesson(3)], "A|1": [lesson(1)], "B|0": [lesson(1), lesson(2)], "B|10": [lesson(1)] };
  const free = freeVocab(full);
  assert.deepEqual(Object.keys(free).sort(), ["A|0", "B|0"]);
  assert.equal(free["A|0"]?.length, 1);
  assert.equal(free["A|0"]?.[0]?.[0], 1);
});

test("freeVocab bỏ qua quyển rỗng và không đổi dữ liệu gốc", () => {
  const full: VocabFile = { "A|0": [] , "C|0": [lesson(1), lesson(2)] };
  const free = freeVocab(full);
  assert.deepEqual(Object.keys(free), ["C|0"]);
  assert.equal(full["C|0"]?.length, 2);
});
