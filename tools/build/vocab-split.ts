import type { VocabFile } from "../../src/data/types";

/**
 * Phần từ vựng miễn phí đi kèm trang: chỉ bài đầu của quyển đầu mỗi giáo trình (khóa kết thúc bằng "|0", chỉ số bài 0),
 * đúng với quy tắc "bài miễn phí" của app. Toàn bộ phần còn lại chỉ máy chủ gửi cho người có quyền (xem worker/).
 */
export function freeVocab(full: VocabFile): VocabFile {
  const out: VocabFile = {};
  for (const [key, lessons] of Object.entries(full)) {
    if (key.endsWith("|0") && lessons.length > 0) out[key] = lessons.slice(0, 1);
  }
  return out;
}
