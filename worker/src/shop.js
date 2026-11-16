// Bảng giá cửa hàng do MÁY CHỦ giữ: quyền lợi của đơn mua hàng được tính ở đây từ danh sách dòng hàng, không nhận con số từ admin hay khách.
// Sản phẩm có sẵn (khóa học theo ngôn ngữ và gói, tài liệu) phải khớp với src/js/core/languages-and-helpers.js; test tests/shop/pricing-sync.test.ts so hai bên.
import { MAX_GRANT, MAX_PREMIUM_MONTHS_PER_ORDER } from './economy.js';

export const LANG_CODES = ['en', 'zh', 'ja', 'ko', 'de', 'fr', 'es'];
export const COURSE_PLANS = {
  '1m': { months: 1, vnd: 100000, chips: 10000 },
  '3m': { months: 3, vnd: 285000, chips: 30000 },
  '6m': { months: 6, vnd: 550000, chips: 60000 },
  '12m': { months: 12, vnd: 1000000, chips: 100000 },
  '24m': { months: 24, vnd: 1700000, chips: 200000 },
  life: { months: MAX_PREMIUM_MONTHS_PER_ORDER, vnd: 2000000, chips: 500000 }, // trọn đời = 1200 tháng
};
export const DOC_PRICE = 100000;

const krw = (vnd) => Math.max(100, Math.round(vnd / 19 / 100) * 100);
const jpy = (vnd) => Math.max(10, Math.round(vnd / 160 / 10) * 10);
const twd = (vnd) => Math.max(1, Math.round(vnd / 800));
const prices = (vnd) => ({ VND: vnd, KRW: krw(vnd), JPY: jpy(vnd), TWD: twd(vnd) });

/** Sản phẩm có sẵn theo mã: cr-<ngôn ngữ>-<gói> hoặc docm-<ngôn ngữ>; null nếu không phải. */
export function builtinProduct(id) {
  let m = /^cr-([a-z]{2})-(\w+)$/.exec(id);
  if (m && LANG_CODES.includes(m[1]) && Object.hasOwn(COURSE_PLANS, m[2])) {
    const pl = COURSE_PLANS[m[2]];
    return { price: prices(pl.vnd), rewardXu: 0, rewardChips: 0, months: pl.months, planChips: pl.chips, grants: [`access:${m[1]}`] };
  }
  m = /^docm-([a-z]{2})$/.exec(id);
  if (m && LANG_CODES.includes(m[1])) return { price: prices(DOC_PRICE), rewardXu: 0, rewardChips: 0, months: 0, planChips: 0, grants: [`doc-${m[1]}`], doc: true };
  return null;
}

/** Sản phẩm theo mã, áp chỉnh sửa giá/thưởng mà admin đã lưu trong cấu hình cửa hàng (chỉ price, rewardXu, rewardChips). */
export function resolveProduct(id, store) {
  const custom = (store.customProducts || []).find((p) => p && p.id === id);
  if (custom) return { price: custom.price, rewardXu: custom.rewardXu || 0, rewardChips: custom.rewardChips || 0, months: 0, planChips: 0, grants: [], doc: custom.cat === 'study' };
  const base = builtinProduct(id);
  if (!base) return null;
  const ed = store.productEdits && Object.hasOwn(store.productEdits, id) ? store.productEdits[id] : null;
  if (!ed) return base;
  return { ...base, price: { ...base.price, ...(ed.price || {}) }, rewardXu: ed.rewardXu ?? base.rewardXu, rewardChips: ed.rewardChips ?? base.rewardChips };
}

/**
 * Tính tổng tiền và quyền lợi của một đơn mua hàng. Trả về null nếu có dòng hàng không còn tồn tại (đơn cần xử lý tay).
 * months đã bị chặn ở MAX_PREMIUM_MONTHS_PER_ORDER; xu và chip bị chặn ở MAX_GRANT.
 */
export function priceOrder(lines, currency, store) {
  const out = { total: 0, xu: 0, chips: 0, months: 0, grants: [], docs: false };
  for (const l of lines) {
    const p = resolveProduct(l.id, store);
    let unit = p && p.price ? p.price[currency] : undefined;
    // Sản phẩm admin tạo trước khi có Đài tệ chưa có giá TWD: quy đổi từ VND giống trình duyệt.
    if (unit === undefined && currency === 'TWD' && p && p.price && Number.isInteger(p.price.VND)) unit = twd(p.price.VND);
    if (!p || !Number.isInteger(unit) || unit < 1) return null;
    out.total += unit * l.qty;
    out.xu += p.rewardXu * l.qty;
    out.chips += (p.rewardChips + p.planChips) * l.qty;
    out.months += p.months * l.qty;
    for (const g of p.grants) if (!out.grants.includes(g)) out.grants.push(g);
    if (p.doc) out.docs = true;
  }
  out.months = Math.min(MAX_PREMIUM_MONTHS_PER_ORDER, out.months);
  out.xu = Math.min(MAX_GRANT, out.xu);
  out.chips = Math.min(MAX_GRANT, out.chips);
  return out;
}
