/** Các ngôn ngữ có bộ từ vựng riêng. Thứ tự này cũng là thứ tự xuất file khi build. */
export const LANG_CODES = ["en", "zh", "ja", "ko", "de", "fr", "es"] as const;
export type LangCode = (typeof LANG_CODES)[number];

export function isLangCode(value: string): value is LangCode {
  return (LANG_CODES as readonly string[]).includes(value);
}

/** Một dòng từ vựng thô, giữ nguyên dạng mảng như trong data/vocab/*.json (số cột khác nhau theo ngôn ngữ). */
export type VocabRow = ReadonlyArray<string | number | undefined>;
/** Một bài: [số bài, các dòng từ]. */
export type VocabLesson = readonly [number, VocabRow[]];
/** Toàn bộ từ vựng một ngôn ngữ, khóa dạng "Tên giáo trình|chỉ số quyển". */
export type VocabFile = Record<string, VocabLesson[]>;

export interface DailyWord {
  term?: string;
  reading?: string;
  meaning?: string;
  example?: string;
  exampleVi?: string;
}

export interface DailyGrammar {
  title?: string;
  pattern?: string;
  explain?: string;
  example?: string;
  exampleVi?: string;
}

/** Phần bổ sung cho "bài ngày", tính trước lúc build từ bộ từ vựng đầy đủ. */
export interface DailyFile {
  vocab: DailyWord[];
  grammar: DailyGrammar[];
}

/** Bảng tra tên file đã băm nội dung (đường dẫn tương đối so với trang). */
export interface DataManifest {
  vocab: Record<LangCode, string>;
  daily: Record<LangCode, string>;
}
