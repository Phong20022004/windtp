import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

interface RealExam {
  id: string;
  passages: string[];
  questions: { n: number; q: string; o: string[]; a: number; p?: number }[];
}

for (const file of readdirSync("data/exams").filter((f) => f.endsWith(".json"))) {
  test(`đề thi thật ${file}: mọi câu có 4 đáp án và đáp án đúng hợp lệ`, () => {
    const data = JSON.parse(readFileSync(`data/exams/${file}`, "utf8")) as { exams: RealExam[] };
    assert.ok(data.exams.length > 0);
    const ids = new Set<string>();
    for (const exam of data.exams) {
      assert.ok(!ids.has(exam.id), `trùng id ${exam.id}`);
      ids.add(exam.id);
      assert.ok(exam.questions.length >= 40, `${exam.id} quá ít câu`);
      for (const q of exam.questions) {
        assert.equal(q.o.length, 4, `${exam.id} câu ${q.n}`);
        assert.ok(q.a >= 1 && q.a <= 4, `${exam.id} câu ${q.n} thiếu đáp án`);
        assert.ok(q.o.every((x) => x.length > 0), `${exam.id} câu ${q.n} có đáp án rỗng`);
        if (q.p !== undefined) assert.ok(exam.passages[q.p], `${exam.id} câu ${q.n} thiếu đoạn văn`);
      }
    }
  });
}
