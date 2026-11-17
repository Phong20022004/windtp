// Sự kiện chào mừng sau đăng nhập (WINDTP Login Celebration). Máy chủ là nguồn sự thật duy nhất về "hôm nay có sự kiện nào":
// trình duyệt chỉ gửi ngày địa phương của người dùng, máy chủ tính lịch dương/âm, kiểm tra cấu hình và chống nhận quà trùng.
import { MAX_GRANT } from './economy.js';

export const EVENTS = {
  newyear: { name: 'Tết Dương lịch', theme: 'newyear', gift: 'Thiệp chúc mừng năm mới', reward: false },
  valentine: { name: 'Valentine', theme: 'valentine', gift: 'Trái tim ảo & thiệp Valentine', reward: false },
  women: { name: 'Quốc tế Phụ nữ', theme: 'women', gift: 'Bông hồng ảo', reward: false },
  white: { name: 'Valentine Trắng', theme: 'white', gift: 'Hộp chocolate ảo', reward: false },
  fools: { name: 'Cá tháng Tư', theme: 'fools', gift: '', reward: false }, // chỉ là trò đùa, không bao giờ cộng/trừ Xu
  halloween: { name: 'Halloween', theme: 'halloween', gift: 'Sticker bí ngô', reward: false },
  men: { name: 'Quốc tế Nam giới', theme: 'men', gift: 'Huy hiệu Quốc tế Nam giới', reward: false },
  xmas: { name: 'Giáng sinh', theme: 'xmas', gift: 'Thiệp Giáng sinh & sticker ông già Noel', reward: false },
  tet: { name: 'Tết Nguyên đán', theme: 'tet', gift: 'Lì xì, thiệp Tết, khung avatar Tết', reward: true },
  midautumn: { name: 'Trung thu', theme: 'midautumn', gift: 'Sticker thỏ ngọc & thiệp Trung thu', reward: false },
  qixi: { name: 'Thất Tịch', theme: 'qixi', gift: 'Thiệp tình yêu', reward: false },
  wedding: { name: 'Đám cưới thế kỷ', theme: 'wedding', gift: 'Thiệp cưới, sticker cặp đôi, khung avatar & huy hiệu', reward: true },
};
const ID_LIST = Object.keys(EVENTS);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const int = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null);

export const DEFAULT_CONFIG = { enabled: true, events: {}, wedding: { start: '', days: 3 }, force: null };

/** Làm sạch cấu hình do admin gửi. Trả null nếu sai định dạng. */
export function sanitizeCelebration(input) {
  if (!input || typeof input !== 'object') return null;
  const out = { enabled: input.enabled !== false, events: {}, wedding: { start: '', days: 3 }, force: null };
  for (const id of ID_LIST) {
    const e = (input.events || {})[id];
    if (e === undefined) continue;
    if (!e || typeof e !== 'object') return null;
    const xu = int(e.xu ?? 0, 0, MAX_GRANT), chips = int(e.chips ?? 0, 0, MAX_GRANT);
    if (xu === null || chips === null) return null;
    const duration = int(e.duration ?? 0, 0, 120);
    if (duration === null || (duration !== 0 && duration < 10)) return null;
    const sound = e.sound ?? 'auto';
    if (!['auto', 'boom', 'chime', 'none'].includes(sound)) return null;
    const repeat = e.repeat ?? 'year';
    if (!['year', 'daily'].includes(repeat)) return null;
    const countries = Array.isArray(e.countries) ? e.countries.map((c) => String(c).toUpperCase()) : [];
    if (countries.length > 10 || countries.some((c) => !/^[A-Z]{2}$/.test(c))) return null;
    // Khoảng ngày tùy chỉnh (ghi đè ngày mặc định): from/to dạng YYYY-MM-DD, cả hai hoặc không có.
    let range = null;
    if (e.from || e.to) {
      if (!DATE.test(e.from || '') || !DATE.test(e.to || '') || Number.isNaN(Date.parse(e.from)) || Number.isNaN(Date.parse(e.to)) || e.to < e.from) return null;
      if (Date.parse(e.to) - Date.parse(e.from) > 31 * 86400000) return null;
      range = { from: e.from, to: e.to };
    }
    out.events[id] = { enabled: e.enabled !== false, range, xu: id === 'fools' ? 0 : xu, chips: id === 'fools' ? 0 : chips, duration, sound, repeat, countries };
  }
  const w = input.wedding;
  if (w) {
    if (typeof w !== 'object' || (w.start && (!DATE.test(w.start) || Number.isNaN(Date.parse(w.start))))) return null;
    const days = int(w.days ?? 3, 1, 14);
    if (days === null) return null;
    out.wedding = { start: w.start || '', days };
  }
  if (input.force) {
    if (!ID_LIST.includes(input.force.id)) return null;
    const nonce = int(input.force.nonce ?? 1, 0, 1e9);
    if (nonce === null) return null;
    out.force = { id: input.force.id, nonce };
  }
  return out;
}

export function lunarOf(y, m, d) {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-chinese', { timeZone: 'UTC', month: 'numeric', day: 'numeric' }).formatToParts(new Date(Date.UTC(y, m - 1, d, 12)));
    const mo = parts.find((p) => p.type === 'month')?.value || '', da = parts.find((p) => p.type === 'day')?.value || '';
    return { m: parseInt(mo, 10), d: parseInt(da, 10), leap: /bis|leap/i.test(mo) };
  } catch { return null; }
}
function addDays(y, m, d, n) { const t = new Date(Date.UTC(y, m - 1, d + n)); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; }
const ymd = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Các sự kiện diễn ra vào ngày y-m-d (lịch của người dùng), theo thứ tự ưu tiên hiển thị. period dùng làm khóa "một lần/năm". */
export function eventsOn(y, m, d, config = DEFAULT_CONFIG, country = '') {
  if (config.enabled === false) return [];
  const out = [], lu = lunarOf(y, m, d);
  const add = (id, period, extra = {}) => out.push({ id, period: String(period), ...extra });
  if (m === 1 && d === 1) add('newyear', y, { midnight: true });
  if (m === 2 && d === 14) add('valentine', y);
  if (m === 3 && d === 8) add('women', y);
  if (m === 3 && d === 14) add('white', y);
  if (m === 4 && d === 1) add('fools', y);
  if (m === 10 && d === 31) add('halloween', y);
  if (m === 11 && d === 19) add('men', y);
  if (m === 12 && (d === 24 || d === 25)) add('xmas', y);
  if (lu && !lu.leap) {
    const tomorrow = addDays(y, m, d, 1), nl = lunarOf(...tomorrow);
    const chapEnd = lu.m === 12 && nl && nl.m === 1 && nl.d === 1; // 30 (hoặc 29) tháng Chạp
    if (chapEnd || (lu.m === 1 && lu.d >= 1 && lu.d <= 6)) add('tet', y, { midnight: lu.m === 1 && lu.d === 1 });
    if (lu.m === 8 && (lu.d === 14 || lu.d === 15)) add('midautumn', y);
    if (lu.m === 7 && lu.d === 7) add('qixi', y);
  }
  // Khoảng ngày do admin đặt thay hoàn toàn ngày mặc định của sự kiện đó.
  const cur = ymd(y, m, d);
  for (const id of ID_LIST) {
    const r = config.events?.[id]?.range;
    if (!r) continue;
    for (let i = out.length - 1; i >= 0; i--) if (out[i].id === id) out.splice(i, 1);
    if (cur >= r.from && cur <= r.to) add(id, y, { midnight: cur === r.from });
  }
  const w = config.wedding;
  if (w && w.start) {
    const s = Date.parse(w.start + 'T00:00:00Z'), cur = Date.UTC(y, m - 1, d);
    if (cur >= s && cur < s + w.days * 86400000) add('wedding', w.start, { midnight: cur === s });
  }
  if (config.force && !out.some((e) => e.id === config.force.id && e.forced)) {
    out.unshift({ id: config.force.id, period: `force${config.force.nonce}`, forced: true, midnight: false });
  }
  return out
    .filter((e) => e.forced || (config.events?.[e.id]?.enabled !== false))
    // Giới hạn quốc gia: danh sách rỗng = áp dụng mọi nơi; sự kiện bật thử (forced) luôn áp dụng cho mọi người.
    .filter((e) => e.forced || !(config.events?.[e.id]?.countries || []).length || (country && config.events[e.id].countries.includes(country)))
    .map((e) => {
      const cfg = config.events?.[e.id] || {}, def = EVENTS[e.id];
      const period = cfg.repeat === 'daily' && !e.forced ? `${e.period}:${ymd(y, m, d)}` : e.period;
      return { ...e, period, range: undefined, name: def.name, theme: def.theme, gift: def.gift, xu: def.reward || e.id !== 'fools' ? cfg.xu || 0 : 0, chips: cfg.chips || 0, duration: cfg.duration || 60, sound: cfg.sound || 'auto', repeat: cfg.repeat || 'year' };
    });
}

export const claimKey = (id, period) => `celeb:${id}:${period}`;

/** Sự kiện sắp tới trong `within` ngày kể từ ngày y-m-d (để hiện "còn N ngày"); null nếu không có hoặc hôm nay đã có sự kiện. */
export function upcomingFrom(y, m, d, config = DEFAULT_CONFIG, country = '', within = 10) {
  if (eventsOn(y, m, d, config, country).length) return null;
  for (let i = 1; i <= within; i++) {
    const [ny, nm, nd] = addDays(y, m, d, i);
    const ev = eventsOn(ny, nm, nd, { ...config, force: null }, country)[0];
    if (ev) return { id: ev.id, name: ev.name, theme: ev.theme, days: i };
  }
  return null;
}
