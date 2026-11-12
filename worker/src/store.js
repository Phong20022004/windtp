// Cấu hình cửa hàng do admin đăng (sản phẩm thêm/sửa/ẩn, danh mục tin rao). Chỉ giữ các trường biết trước, đúng kiểu và giới hạn.
import { MAX_GRANT } from './economy.js';

const ID = /^[\w-]{1,40}$/;
export const IMG_KEY = /^img\/[0-9a-f]{32}\.(jpg|png|webp)$/;
const str = (v, max, min = 0) => (typeof v === 'string' && v.trim().length >= min && v.length <= max ? v.trim() : null);
const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null);

function price(p, partial) {
  if (!p || typeof p !== 'object') return null;
  const out = {};
  for (const c of ['VND', 'KRW', 'JPY']) {
    if (p[c] === undefined && partial) continue;
    const v = int(p[c], 1, 1e9);
    if (v === null) return null;
    out[c] = v;
  }
  return out;
}

function fields(src, full) {
  const out = {};
  if (src.name !== undefined || full) { const v = str(src.name, 120, 1); if (v === null) return null; out.name = v; }
  if (src.desc !== undefined || full) { const v = str(src.desc ?? '', 300); if (v === null) return null; out.desc = v; }
  if (src.price !== undefined || full) { const v = price(src.price, !full); if (v === null) return null; out.price = v; }
  for (const k of ['rewardXu', 'rewardChips']) {
    if (src[k] === undefined && !full) continue;
    const v = int(src[k] ?? 0, 0, MAX_GRANT); if (v === null) return null; out[k] = v;
  }
  if (src.img !== undefined && src.img !== '') { if (typeof src.img !== 'string' || !IMG_KEY.test(src.img)) return null; out.img = src.img; }
  return out;
}

/** Trả về cấu hình đã làm sạch, hoặc null nếu có phần tử sai (từ chối cả gói để không lưu dữ liệu lỡ). */
export function sanitizeStore(input) {
  if (!input || typeof input !== 'object') return null;
  const products = Array.isArray(input.customProducts) ? input.customProducts : null;
  const edits = input.productEdits && typeof input.productEdits === 'object' && !Array.isArray(input.productEdits) ? input.productEdits : null;
  const hidden = Array.isArray(input.hiddenProducts) ? input.hiddenProducts : null;
  const cats = Array.isArray(input.customCats) ? input.customCats : null;
  if (!products || !edits || !hidden || !cats || products.length > 200 || hidden.length > 500 || cats.length > 8 || Object.keys(edits).length > 500) return null;
  const out = { customProducts: [], productEdits: {}, hiddenProducts: [], customCats: [] };
  const seen = new Set();
  for (const p of products) {
    if (!p || typeof p.id !== 'string' || !ID.test(p.id) || seen.has(p.id)) return null;
    seen.add(p.id);
    const f = fields(p, true);
    const cat = str(p.cat, 20, 1), sub = str(p.sub ?? '', 40), emoji = str(p.emoji ?? '', 8), ts = int(p.ts ?? 0, 0, 4e12);
    if (!f || cat === null || sub === null || emoji === null || ts === null) return null;
    out.customProducts.push({ id: p.id, custom: true, ...f, cat, sub, emoji, ts });
  }
  for (const [id, e] of Object.entries(edits)) {
    if (!ID.test(id) || !e || typeof e !== 'object') return null;
    const f = fields(e, false);
    if (!f) return null;
    out.productEdits[id] = f;
  }
  for (const id of hidden) { if (typeof id !== 'string' || !ID.test(id)) return null; out.hiddenProducts.push(id); }
  const catIds = new Set();
  for (const c of cats) {
    const name = str(c && c.name, 20, 2), emoji = str(c && c.emoji, 8, 1);
    if (!c || typeof c.id !== 'string' || !ID.test(c.id) || catIds.has(c.id) || name === null || emoji === null) return null;
    catIds.add(c.id);
    out.customCats.push({ id: c.id, name, emoji });
  }
  return out;
}

const SIG = [
  ['jpg', [0xff, 0xd8, 0xff]],
  ['png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
];
/** Nhận dạng ảnh theo nội dung (không tin Content-Type do người gửi khai). */
export function sniffImage(bytes) {
  for (const [ext, sig] of SIG) if (sig.every((b, i) => bytes[i] === b)) return ext;
  const ascii = (a, b) => String.fromCharCode(...bytes.slice(a, b));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  return null;
}
export const IMAGE_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export const MAX_IMAGE_BYTES = 250 * 1024;
