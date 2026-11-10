// Tính trước phần bổ sung cho "bài ngày" từ bộ từ vựng đầy đủ.
// Thuật toán giữ nguyên từng bước so với enrichDaily() cũ chạy trên trình duyệt (xáo trộn bằng LCG theo seed cố định),
// nên kết quả mỗi ngôn ngữ giống hệt trước đây; khác biệt duy nhất là việc này diễn ra lúc build, không phải lúc chạy.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { LANG_CODES, type DailyFile, type DailyGrammar, type DailyWord, type LangCode, type VocabFile, type VocabRow } from "../../src/data/types";

const GRAMMAR_PREFIX = "Cấu trúc";

const SEEDS: Readonly<Record<LangCode, number>> = {
  en: 20261108,
  zh: 20261109,
  ko: 20261110,
  ja: 20261108,
  de: 20261108,
  fr: 20261108,
  es: 20261108,
};

function poolSize(code: LangCode): number {
  return code === "es" ? 3000 : 2000;
}

const text = (value: string | number | undefined): string => (value === undefined ? "" : String(value));

/** Khóa nào cũng cần có `example` mới được đưa vào bài ngày (trừ phần ngữ pháp có điều kiện riêng). */
function acceptsAsWord(code: LangCode, key: string, row: VocabRow): boolean {
  if (!row[4]) return false;
  if (code === "es" && !row[5]) return false;
  if (code === "ko" && key.startsWith("Yonsei Reading") && (row[2] === "Ngữ pháp" || !row[5])) return false;
  if (code === "fr" && /^câu/i.test(text(row[2]))) return false;
  if (code === "zh" && !/^[㐀-鿿]+$/.test(text(row[0]))) return false;
  return true;
}

function grammarOf(code: LangCode, row: VocabRow): DailyGrammar {
  const first = text(row[0]);
  const second = text(row[1]);
  return {
    title: code === "de" && second ? second : first,
    pattern: code === "es" && second ? `${first}  ≈  ${second}` : code === "fr" && second ? second : first,
    explain: row[3] === undefined ? undefined : text(row[3]),
    example: row[4] === undefined ? undefined : text(row[4]),
    exampleVi: row[5] === undefined ? undefined : text(row[5]),
  };
}

export function computeDailyExtras(code: LangCode, baseTerms: readonly string[], vocab: VocabFile): DailyFile {
  const seen = new Set(baseTerms.map((term) => term.toLowerCase()));
  const pool: DailyWord[] = [];
  const grammar: DailyGrammar[] = [];

  for (const key of Object.keys(vocab)) {
    const isGrammar = key.startsWith(GRAMMAR_PREFIX);
    for (const lesson of vocab[key] ?? []) {
      for (const row of lesson[1]) {
        if (isGrammar) {
          if (row[4]) grammar.push(grammarOf(code, row));
          continue;
        }
        const term = text(row[0]);
        const lower = term.toLowerCase();
        if (!acceptsAsWord(code, key, row) || seen.has(lower)) continue;
        seen.add(lower);
        pool.push({
          term,
          reading: row[1] === undefined ? undefined : text(row[1]),
          meaning: row[3] === undefined ? undefined : text(row[3]),
          example: row[4] === undefined ? undefined : text(row[4]),
          exampleVi: row[5] === undefined ? undefined : text(row[5]),
        });
      }
    }
  }

  let state = SEEDS[code];
  const next = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    const a = pool[i];
    const b = pool[j];
    if (a === undefined || b === undefined) continue;
    pool[i] = b;
    pool[j] = a;
  }

  return { vocab: pool.slice(0, poolSize(code)), grammar };
}

/**
 * Lấy từ vựng gốc (vài từ mỗi ngôn ngữ) từ khối `var LANGUAGES = [...]` trong languages-and-helpers.js.
 * Khối này là dữ liệu thuần nên chạy được trong sandbox; nếu cấu trúc file đổi thì báo lỗi ngay lúc build.
 */
export function loadBaseTerms(root: string): Record<LangCode, string[]> {
  const source = fs.readFileSync(path.join(root, "src/js/core/languages-and-helpers.js"), "utf8");
  const start = source.indexOf("var LANGUAGES = [");
  const end = source.indexOf("var COURSE_PLANS");
  if (start < 0 || end < start) {
    throw new Error("Không tìm thấy khối `var LANGUAGES` trong languages-and-helpers.js; cần cập nhật tools/build/vocab-data.ts");
  }
  const sandbox: { LANGUAGES?: Array<{ code: string; vocab: Array<{ term: string }> }> } = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source.slice(start, end)};this.LANGUAGES = LANGUAGES;`, sandbox, { timeout: 5000 });

  const result = {} as Record<LangCode, string[]>;
  for (const code of LANG_CODES) {
    const language = sandbox.LANGUAGES?.find((entry) => entry.code === code);
    if (!language) throw new Error(`LANGUAGES thiếu ngôn ngữ "${code}"`);
    result[code] = language.vocab.map((entry) => entry.term);
  }
  return result;
}
