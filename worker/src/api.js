// API ví / đơn hàng / kiểm duyệt. Trình duyệt chỉ GỬI YÊU CẦU; mọi số tiền, giá, thưởng do máy chủ quyết định.
import * as E from './economy.js';
import { sanitizeStore, sniffImage, IMAGE_TYPES, IMG_KEY, MAX_IMAGE_BYTES } from './store.js';

class HttpError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
const bad = (code = 'bad-request') => new HttpError(400, code);

const dayKey = (now) => new Date(now + E.VN_OFFSET_MS).toISOString().slice(0, 10);
/** Tra bảng chỉ theo khóa riêng của đối tượng: chặn "constructor", "__proto__"... đi vào Object.prototype. */
const own = (table, key) => (typeof key === 'string' && Object.hasOwn(table, key) ? table[key] : undefined);
const isInt = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

/** Giữ tối đa MAX_ORDER_LINES dòng {id, qty}; id là chuỗi ngắn, qty nguyên 1..99. Trả JSON hoặc null. */
function cleanLines(value) {
  if (!Array.isArray(value)) return null;
  const out = [];
  for (const line of value.slice(0, E.MAX_ORDER_LINES)) {
    if (line && typeof line.id === 'string' && line.id && line.id.length <= 60 && isInt(line.qty, 1, 99)) out.push({ id: line.id, qty: line.qty });
  }
  return out.length ? JSON.stringify(out) : null;
}

/** Chỉ giữ các trường liên hệ cần cho giao hàng/gửi tài liệu, mỗi trường là chuỗi ngắn; trả JSON hoặc null. */
function cleanContact(value) {
  if (!value || typeof value !== 'object') return null;
  const out = {};
  for (const key of ['address', 'phone', 'docEmail', 'bank', 'bankName', 'holder']) {
    if (typeof value[key] === 'string' && value[key].trim()) out[key] = value[key].trim().slice(0, 200);
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}

function ageFromBirth(birth, now) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth || '');
  if (!m) return -1;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return -1;
  const n = new Date(now + E.VN_OFFSET_MS);
  let age = n.getUTCFullYear() - y;
  if (n.getUTCMonth() < mo - 1 || (n.getUTCMonth() === mo - 1 && n.getUTCDate() < d)) age--;
  return age >= 0 && age <= 120 ? age : -1;
}

export function createApi({ verify, now = () => Date.now() }) {
  const q = (db, sql, ...args) => db.prepare(sql).bind(...args);
  const txStmt = (db, uid, kind, delta, chips, title, ref, t) =>
    q(db, 'INSERT INTO tx (uid, kind, delta, chips_delta, title, ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', uid, kind, delta, chips, title, ref ?? null, t);

  // Lô lệnh là một giao dịch nguyên tử: lỗi ràng buộc (số dư âm, trùng khóa) hủy toàn bộ.
  async function atomic(db, stmts) {
    try { await db.batch(stmts); } catch (e) {
      const msg = String(e && e.message);
      if (/CHECK constraint/i.test(msg)) throw new HttpError(402, 'insufficient-or-limit');
      if (/UNIQUE|PRIMARY KEY/i.test(msg)) throw new HttpError(409, 'duplicate');
      throw e;
    }
  }
  async function wallet(db, uid, t, email) {
    await q(db, 'INSERT OR IGNORE INTO wallets (uid, created_at) VALUES (?, ?)', uid, t).run();
    if (email) await q(db, 'UPDATE wallets SET email = ? WHERE uid = ? AND (email IS NULL OR email != ?)', email.toLowerCase(), uid, email.toLowerCase()).run();
    return q(db, 'SELECT balance, chips, premium_until AS premiumUntil, birth FROM wallets WHERE uid = ?', uid).first();
  }
  const DEVICE_RE = /^[A-Za-z0-9_-]{16,64}$/;
  /** Ghi nhận thiết bị của tài khoản; thiết bị thứ MAX_DEVICES+1 bị từ chối (một câu lệnh nguyên tử nên song song cũng không vượt). */
  async function registerDevice(db, uid, deviceId, t) {
    const row = await q(db, 'SELECT last_seen AS lastSeen FROM devices WHERE uid = ? AND device_id = ?', uid, deviceId).first();
    if (row) {
      if (t - row.lastSeen > E.DEVICE_TOUCH_MS) await q(db, 'UPDATE devices SET last_seen = ? WHERE uid = ? AND device_id = ?', t, uid, deviceId).run();
      return;
    }
    await q(db, 'DELETE FROM devices WHERE uid = ? AND last_seen < ?', uid, t - E.DEVICE_IDLE_MS).run();
    try {
      const r = await q(db, 'INSERT INTO devices (uid, device_id, first_seen, last_seen) SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM devices WHERE uid = ?) < ?', uid, deviceId, t, t, uid, E.MAX_DEVICES).run();
      if (!r.meta.changes) throw new HttpError(403, 'device-limit');
    } catch (e) {
      if (e instanceof HttpError) throw e;
      if (!/UNIQUE|PRIMARY KEY/i.test(String(e && e.message))) throw e; // cùng thiết bị gửi hai yêu cầu đầu tiên song song: đã được ghi nhận
    }
  }

  const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ I, O, 0, 1 cho dễ đọc; 32 ký tự nên không lệch xác suất
  const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => CODE_ALPHABET[b % 32]).join('');
  /** Mỗi tài khoản đúng một mã mời, tạo khi cần. */
  async function refCode(db, uid, t) {
    for (let i = 0; i < 6; i++) {
      const have = await q(db, 'SELECT code FROM ref_codes WHERE uid = ?', uid).first();
      if (have) return have.code;
      try { await q(db, 'INSERT INTO ref_codes (uid, code, created_at) VALUES (?, ?, ?)', uid, newCode(), t).run(); } catch (e) {
        if (!/UNIQUE|PRIMARY KEY/i.test(String(e && e.message))) throw e; // trùng mã (hiếm) hoặc tạo song song: đọc lại/thử lại
      }
    }
    throw new HttpError(503, 'unavailable');
  }

  const credit = (db, uid, xu, chips) => q(db, 'UPDATE wallets SET balance = balance + ?, chips = chips + ? WHERE uid = ?', xu, chips, uid);

  async function readBody(request, max = 8192) {
    const text = await request.text();
    if (text.length > max) throw new HttpError(413, 'too-large');
    if (!text) return {};
    try { const v = JSON.parse(text); if (v && typeof v === 'object') return v; } catch { /* rơi xuống lỗi */ }
    throw bad('bad-json');
  }

  const routes = [];
  const route = (method, pattern, auth, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), auth, fn });

  route('GET', '/me', 'user', async ({ db, user, t }) => {
    const w = await wallet(db, user.uid, t, user.emailVerified ? user.email : '');
    const rows = await q(db, 'SELECT id, kind, delta, chips_delta AS chips, title, created_at AS at FROM tx WHERE uid = ? ORDER BY id DESC LIMIT 50', user.uid).all();
    const own = await q(db, 'SELECT item_id AS id FROM entitlements WHERE uid = ?', user.uid).all();
    return { uid: user.uid, admin: user.admin, balance: w.balance, chips: w.chips, premiumUntil: w.premiumUntil, birth: w.birth, history: rows.results, owned: own.results.map((r) => r.id), serverTime: t };
  });

  route('GET', '/devices', 'user', async ({ db, user, deviceId }) => ({
    max: E.MAX_DEVICES,
    devices: user.admin ? [] : (await q(db, 'SELECT device_id AS id, first_seen AS firstSeen, last_seen AS lastSeen FROM devices WHERE uid = ? ORDER BY first_seen', user.uid).all()).results.map((d) => ({ ...d, current: d.id === deviceId })),
  }));
  // Gỡ một thiết bị khác để nhường chỗ (không gỡ được thiết bị đang dùng).
  route('POST', '/devices/remove', 'user', async ({ db, user, deviceId, body }) => {
    if (typeof body.deviceId !== 'string' || !DEVICE_RE.test(body.deviceId)) throw bad('bad-device');
    if (body.deviceId === deviceId) throw bad('current-device');
    const r = await q(db, 'DELETE FROM devices WHERE uid = ? AND device_id = ?', user.uid, body.deviceId).run();
    if (!r.meta.changes) throw new HttpError(404, 'not-found');
    return { ok: true };
  });
  // Admin mở khóa cho người dùng bị kẹt thiết bị (ví dụ mất máy cũ).
  route('POST', '/admin/devices/reset', 'admin', async ({ db, body }) => {
    if (typeof body.uid !== 'string' || !body.uid || body.uid.length > 128) throw bad('bad-uid');
    const r = await q(db, 'DELETE FROM devices WHERE uid = ?', body.uid).run();
    return { ok: true, removed: r.meta.changes };
  });

  route('GET', '/referral', 'user', async ({ db, user, t }) => {
    await wallet(db, user.uid, t);
    const code = await refCode(db, user.uid, t);
    const stats = await q(db, 'SELECT COUNT(*) AS invited, COUNT(rewarded_at) AS rewarded FROM referrals WHERE inviter = ?', user.uid).first();
    const mine = await q(db, 'SELECT 1 AS x FROM referrals WHERE invitee = ?', user.uid).first();
    return { code, reward: E.REFERRAL_REWARD, invited: stats.invited, rewarded: stats.rewarded, referredBy: !!mine };
  });

  // Nhập mã mời của người khác: một lần duy nhất, không dùng mã của mình, và chỉ trước khi tự mình mua khóa học.
  route('POST', '/referral/redeem', 'user', async ({ db, user, t, body }) => {
    const code = String(body.code ?? '').toUpperCase().replace(/[\s-]/g, '');
    if (!/^[A-Z2-9]{8}$/.test(code)) throw bad('bad-code');
    const owner = await q(db, 'SELECT uid FROM ref_codes WHERE code = ?', code).first();
    if (!owner) throw new HttpError(404, 'no-code');
    if (owner.uid === user.uid) throw bad('self-referral');
    const bought = await q(db, "SELECT 1 AS x FROM entitlements WHERE uid = ? AND item_id LIKE 'access:%'", user.uid).first();
    if (bought) throw new HttpError(409, 'already-purchased');
    await wallet(db, user.uid, t);
    await atomic(db, [q(db, 'INSERT INTO referrals (invitee, inviter, code, created_at) VALUES (?, ?, ?, ?)', user.uid, owner.uid, code, t)]);
    return { ok: true };
  });

  route('POST', '/profile/birth', 'user', async ({ db, user, t, body }) => {
    const w = await wallet(db, user.uid, t);
    if (w.birth) throw new HttpError(409, 'birth-locked'); // chỉ đặt một lần, tránh khai lại tuổi để lách hạn mức
    if (ageFromBirth(body.birth, t) < 0) throw bad('bad-birth');
    await q(db, 'UPDATE wallets SET birth = ? WHERE uid = ? AND birth IS NULL', body.birth, user.uid).run();
    return { ok: true };
  });

  route('POST', '/claim', 'user', async ({ db, user, t, body }) => {
    const task = own(E.DAILY_TASKS, body.taskId);
    if (!task) throw bad('unknown-task');
    await wallet(db, user.uid, t);
    await atomic(db, [
      q(db, 'INSERT INTO claims (uid, key, created_at) VALUES (?, ?, ?)', user.uid, `task:${body.taskId}:${dayKey(t)}`, t),
      credit(db, user.uid, task.xu, task.chips),
      txStmt(db, user.uid, 'task', task.xu, task.chips, `Thưởng nhiệm vụ ${body.taskId}`, body.taskId, t),
    ]);
    return { ok: true, xu: task.xu, chips: task.chips };
  });

  route('POST', '/chips/exchange', 'user', async ({ db, user, t, body }) => {
    if (!isInt(body.xu, 1, 1e9)) throw bad('bad-amount');
    const w = await wallet(db, user.uid, t);
    const age = ageFromBirth(w.birth, t);
    if (age < E.MIN_CHIP_AGE) throw new HttpError(403, 'age-required');
    const cap = age < 18 ? E.CHIP_LIM.minorDaily : E.CHIP_LIM.adultDaily;
    await atomic(db, [
      q(db, 'INSERT INTO chip_daily (uid, day, amount, cap) VALUES (?, ?, ?, ?) ON CONFLICT (uid, day) DO UPDATE SET amount = amount + excluded.amount', user.uid, dayKey(t), body.xu, cap),
      credit(db, user.uid, -body.xu, body.xu),
      txStmt(db, user.uid, 'chips', -body.xu, body.xu, `Đổi ${body.xu} Xu sang chip game`, null, t),
    ]);
    return { ok: true };
  });

  route('POST', '/purchase', 'user', async ({ db, user, t, body }) => {
    const item = await q(db, 'SELECT id, name, price FROM catalog WHERE id = ?', String(body.itemId || '')).first();
    if (!item) throw new HttpError(404, 'no-item');
    await wallet(db, user.uid, t);
    await atomic(db, [
      q(db, 'INSERT INTO entitlements (uid, item_id, created_at) VALUES (?, ?, ?)', user.uid, item.id, t),
      credit(db, user.uid, -item.price, 0), // CHECK (balance >= 0) hủy cả lô nếu không đủ Xu
      txStmt(db, user.uid, 'spend', -item.price, 0, `Mua ${item.name}`, item.id, t),
    ]);
    return { ok: true, itemId: item.id };
  });

  route('POST', '/orders', 'user', async ({ db, user, t, body }) => {
    const { kind } = body;
    let currency = body.currency, amount = body.amount, xu = 0, planId = null;
    if (kind === 'topup') {
      if (own(E.TOPUP_RATE, currency) === undefined || !isInt(amount, E.MINPAY[currency], E.MAX_TOPUP_UNITS[currency])) throw bad('bad-amount');
      xu = Math.round(amount * E.TOPUP_RATE[currency]);
    } else if (kind === 'plan') {
      const plan = own(E.PLANS, body.planId);
      if (!plan) throw bad('bad-plan');
      planId = body.planId; currency = 'VND'; amount = plan.vnd;
    } else if (kind === 'shop') {
      if (own(E.TOPUP_RATE, currency) === undefined || !isInt(amount, 1, E.MAX_TOPUP_UNITS[currency])) throw bad('bad-amount');
    } else if (kind === 'fbshare' || kind === 'ctask') {
      currency = 'VND'; amount = 1;
    } else throw bad('bad-kind');
    const pending = await q(db, "SELECT COUNT(*) AS n FROM orders WHERE uid = ? AND status = 'pending'", user.uid).first();
    if (pending.n >= E.MAX_PENDING_ORDERS) throw new HttpError(429, 'too-many-pending');
    let code = typeof body.code === 'string' ? body.code.slice(0, 40) : null;
    let summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, E.MAX_SUMMARY_LEN) || null : null;
    const guards = []; // khóa chống nộp trùng; được xóa khi đơn bị từ chối để người dùng nộp lại
    if (kind === 'fbshare') {
      const link = typeof body.link === 'string' ? body.link.trim() : '';
      const day = dayKey(t); // kỳ hiện tại theo giờ Việt Nam: 01-15 là 'a', còn lại 'b'
      const period = `${day.slice(0, 7)}-${+day.slice(8) <= 15 ? 'a' : 'b'}`;
      if (!E.FB_LINK_RE.test(link) || link.length > 190) throw bad('bad-link');
      if (body.period !== period) throw bad('bad-period');
      code = `fb:${body.period}`; summary = link;
      guards.push([user.uid, `sub:${code}`], ['*', `fblink:${link.toLowerCase().replace(/\/+$/, '')}`]);
    } else if (kind === 'ctask') {
      const task = await q(db, 'SELECT id, title, xu, chips, money, cur FROM tasks WHERE id = ?', String(body.taskId || '')).first();
      if (!task) throw new HttpError(404, 'no-task');
      code = `ctask:${task.id}`; summary = `Nhiệm vụ: ${task.title}`.slice(0, E.MAX_SUMMARY_LEN);
      guards.push([user.uid, `sub:${code}`]);
    }
    const contact = cleanContact(body.contact);
    const lines = cleanLines(body.lines);
    if (guards.length) await atomic(db, guards.map(([u, k]) => q(db, 'INSERT INTO claims (uid, key, created_at) VALUES (?, ?, ?)', u, k, t)));
    const r = await q(db, 'INSERT INTO orders (uid, kind, currency, amount, xu, plan_id, code, email, name, summary, lines, contact, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', user.uid, kind, currency, amount, xu, planId, code, user.emailVerified ? user.email || null : null, user.name || null, summary, lines, contact, t).run();
    return { ok: true, id: r.meta.last_row_id };
  });

  route('GET', '/orders/mine', 'user', async ({ db, user }) => ({
    orders: (await q(db, 'SELECT id, kind, currency, amount, xu, plan_id AS planId, code, summary, status, created_at AS at FROM orders WHERE uid = ? ORDER BY id DESC LIMIT 50', user.uid).all()).results,
  }));

  route('GET', '/admin/orders', 'admin', async ({ db, url }) => {
    const status = ['pending', 'approved', 'rejected'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : 'pending';
    return { orders: (await q(db, 'SELECT * FROM orders WHERE status = ? ORDER BY id LIMIT 200', status).all()).results };
  });

  route('POST', '/admin/orders/:id/approve', 'admin', async ({ db, user, t, params, body }) => {
    const grantItems = [];
    if (body.grants !== undefined) {
      if (!Array.isArray(body.grants) || body.grants.length > E.MAX_ORDER_GRANTS) throw bad('bad-grants');
      for (const id of new Set(body.grants)) {
        if (typeof id !== 'string') throw bad('bad-grants');
        // access:<mã ngôn ngữ> = quyền học theo khóa (không bán lẻ, chỉ admin cấp kèm đơn); còn lại phải có trong catalog.
        if (!/^access:[a-z]{2}$/.test(id) && !(await q(db, 'SELECT 1 AS x FROM catalog WHERE id = ?', id).first())) throw bad('bad-grants');
        grantItems.push(id);
      }
    }
    // Quyền lợi bổ sung do admin quyết định (sau khi đối chiếu thanh toán), chỉ áp dụng cho đơn mua hàng và có trần.
    const extra = { xu: body.xu ?? 0, chips: body.chips ?? 0, months: body.premiumMonths ?? 0 };
    if (!isInt(extra.xu, 0, E.MAX_GRANT) || !isInt(extra.chips, 0, E.MAX_GRANT) || !isInt(extra.months, 0, E.MAX_PREMIUM_MONTHS_PER_ORDER)) throw bad('bad-grants');
    const order = await q(db, 'SELECT * FROM orders WHERE id = ?', +params.id).first();
    if (!order) throw new HttpError(404, 'no-order');
    if (order.kind !== 'shop' && (extra.xu || extra.chips || extra.months)) throw bad('extras-shop-only');
    if (order.status !== 'pending') throw new HttpError(409, 'not-pending');
    await wallet(db, order.uid, t);
    const stmts = [
      q(db, 'INSERT INTO claims (uid, key, created_at) VALUES (?, ?, ?)', 'order', `order:${order.id}`, t), // chống duyệt trùng khi bấm đồng thời
      q(db, "UPDATE orders SET status = 'approved', reviewed_at = ?, reviewed_by = ? WHERE id = ?", t, user.uid, order.id),
    ];
    if (order.kind === 'topup') {
      stmts.push(credit(db, order.uid, order.xu, 0), txStmt(db, order.uid, 'topup', order.xu, 0, `Nạp Xu (${order.currency} ${order.amount})`, String(order.id), t));
    } else if (order.kind === 'plan') {
      const plan = E.PLANS[order.plan_id];
      stmts.push(
        q(db, 'UPDATE wallets SET premium_until = MAX(premium_until, ?) + ?, chips = chips + ? WHERE uid = ?', t, plan.months * E.MONTH_MS, plan.chips, order.uid),
        txStmt(db, order.uid, 'plan', 0, plan.chips, `Premium ${order.plan_id}`, String(order.id), t),
      );
    } else if (order.kind === 'fbshare') {
      stmts.push(credit(db, order.uid, E.FB_REWARD, 0), txStmt(db, order.uid, 'task', E.FB_REWARD, 0, 'Thưởng chia sẻ Facebook', String(order.id), t));
    } else if (order.kind === 'ctask') {
      const task = await q(db, 'SELECT * FROM tasks WHERE id = ?', String(order.code || '').slice(6)).first();
      if (!task) throw new HttpError(404, 'no-task');
      if (task.xu || task.chips) stmts.push(credit(db, order.uid, task.xu, task.chips), txStmt(db, order.uid, 'task', task.xu, task.chips, `Thưởng nhiệm vụ: ${task.title}`.slice(0, 80), String(order.id), t));
    } else {
      // Đơn mua hàng: thưởng nhiệm vụ mua sắm, mỗi loại một lần/ngày (máy chủ biết đơn có thật vì chính admin duyệt).
      const vnd = order.amount * E.TOPUP_RATE[order.currency];
      const day = dayKey(t);
      const bonus = [['shop', E.SHOP_TASK]];
      if (vnd >= E.BIG_SHOP_TASK.thresholdVnd) bonus.push(['bigshop', E.BIG_SHOP_TASK]);
      if (extra.xu || extra.chips) {
        stmts.push(credit(db, order.uid, extra.xu, extra.chips), txStmt(db, order.uid, 'grant', extra.xu, extra.chips, 'Quyền lợi đơn mua hàng', String(order.id), t));
      }
      if (extra.months) {
        stmts.push(
          q(db, 'UPDATE wallets SET premium_until = MAX(premium_until, ?) + ? WHERE uid = ?', t, extra.months * E.MONTH_MS, order.uid),
          txStmt(db, order.uid, 'plan', 0, 0, `Premium ${extra.months} tháng theo đơn`, String(order.id), t),
        );
      }
      for (const [name, b] of bonus) {
        const done = await q(db, 'SELECT 1 AS x FROM claims WHERE uid = ? AND key = ?', order.uid, `task:${name}:${day}`).first();
        if (done) continue;
        stmts.push(
          q(db, 'INSERT INTO claims (uid, key, created_at) VALUES (?, ?, ?)', order.uid, `task:${name}:${day}`, t),
          credit(db, order.uid, b.xu, b.chips),
          txStmt(db, order.uid, 'task', b.xu, b.chips, `Thưởng nhiệm vụ ${name}`, String(order.id), t),
        );
      }
    }
    // Admin (đã đối chiếu thanh toán) có thể kèm danh sách quyền lợi theo đơn: mỗi mã phải có trong catalog.
    for (const itemId of grantItems) stmts.push(q(db, 'INSERT OR IGNORE INTO entitlements (uid, item_id, created_at) VALUES (?, ?, ?)', order.uid, itemId, t));
    // Mã mời: đơn có quyền học khóa (access:<ngôn ngữ>) được duyệt => người mời nhận thưởng đúng một lần cho người được mời này.
    let referralRewarded = false;
    if (grantItems.some((id) => /^access:[a-z]{2}$/.test(id))) {
      const ref = await q(db, 'SELECT inviter FROM referrals WHERE invitee = ? AND rewarded_at IS NULL', order.uid).first();
      if (ref && ref.inviter !== order.uid) {
        const rw = E.REFERRAL_REWARD;
        stmts.push(
          q(db, 'INSERT INTO claims (uid, key, created_at) VALUES (?, ?, ?)', 'ref', `ref-reward:${order.uid}`, t), // chống thưởng trùng
          q(db, 'UPDATE referrals SET rewarded_at = ? WHERE invitee = ? AND rewarded_at IS NULL', t, order.uid),
          q(db, 'INSERT OR IGNORE INTO wallets (uid, created_at) VALUES (?, ?)', ref.inviter, t),
          credit(db, ref.inviter, rw.xu, rw.chips),
          txStmt(db, ref.inviter, 'referral', rw.xu, rw.chips, 'Thưởng mời bạn mua khóa học', String(order.id), t),
        );
        referralRewarded = true;
      }
    }
    await atomic(db, stmts);
    return { ok: true, referralRewarded };
  });

  route('POST', '/admin/orders/:id/reject', 'admin', async ({ db, user, t, params }) => {
    const r = await q(db, "UPDATE orders SET status = 'rejected', reviewed_at = ?, reviewed_by = ? WHERE id = ? AND status = 'pending'", t, user.uid, +params.id).run();
    if (!r.meta.changes) throw new HttpError(409, 'not-pending');
    const o = await q(db, 'SELECT uid, kind, code, summary FROM orders WHERE id = ?', +params.id).first();
    if (o && (o.kind === 'fbshare' || o.kind === 'ctask')) {
      await q(db, 'DELETE FROM claims WHERE uid = ? AND key = ?', o.uid, `sub:${o.code}`).run();
      if (o.kind === 'fbshare') await q(db, 'DELETE FROM claims WHERE uid = ? AND key = ?', '*', `fblink:${String(o.summary).toLowerCase().replace(/\/+$/, '')}`).run();
    }
    return { ok: true };
  });

  // Admin cộng thưởng thủ công cho một người dùng (thay cho cơ chế `credits` lưu ở trình duyệt). Mọi lần cộng đều có dòng sổ ghi người cộng.
  route('POST', '/admin/grant', 'admin', async ({ db, user, t, body }) => {
    let uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    if (!uid && typeof body.email === 'string' && body.email.trim()) {
      const hit = await q(db, 'SELECT uid FROM wallets WHERE email = ?', body.email.trim().toLowerCase()).first();
      if (!hit) throw new HttpError(404, 'no-user');
      uid = hit.uid;
    }
    const xu = body.xu === undefined ? 0 : body.xu;
    const chips = body.chips === undefined ? 0 : body.chips;
    if (!uid || uid.length > 128 || !isInt(xu, 0, E.MAX_GRANT) || !isInt(chips, 0, E.MAX_GRANT) || xu + chips === 0) throw bad('bad-grant');
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 80) : 'Admin cộng thưởng';
    await wallet(db, uid, t);
    await atomic(db, [credit(db, uid, xu, chips), txStmt(db, uid, 'grant', xu, chips, note, `admin:${user.uid}`, t)]);
    return { ok: true };
  });

  route('POST', '/posts', 'user', async ({ db, user, t, body }) => {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (text.length < 3 || text.length > E.MAX_POST_LEN) throw bad('bad-text');
    const tag = typeof body.tag === 'string' ? body.tag.trim() : 'Chung';
    if (!tag || tag.length > 20) throw bad('bad-text');
    const n = await q(db, "SELECT COUNT(*) AS n FROM posts WHERE uid = ? AND created_at > ? AND status != 'deleted'", user.uid, t - 86400000).first();
    if (n.n >= E.MAX_POSTS_PER_DAY) throw new HttpError(429, 'too-many-posts');
    // Bài của admin hiện ngay; bài của người dùng phải chờ admin duyệt (kiểm duyệt do máy chủ giữ, không phải trình duyệt).
    const adm = user.admin ? 1 : 0;
    const r = await q(db, 'INSERT INTO posts (uid, author, text, tag, is_admin, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', user.uid, user.name || 'Người dùng', text, tag, adm, adm ? 'approved' : 'pending', t).run();
    return { ok: true, id: r.meta.last_row_id, status: adm ? 'approved' : 'pending' };
  });
  route('GET', '/posts', 'user', async ({ db, user }) => {
    const rows = (await q(db, "SELECT id, author, text, tag, is_admin AS admin, created_at AS at, (uid = ?) AS mine FROM posts WHERE status = 'approved' ORDER BY id DESC LIMIT 100", user.uid).all()).results;
    const ids = "(SELECT id FROM (SELECT id FROM posts WHERE status = 'approved' ORDER BY id DESC LIMIT 100))";
    const likes = new Map((await q(db, `SELECT post_id, COUNT(*) AS n FROM post_likes WHERE post_id IN ${ids} GROUP BY post_id`).all()).results.map((r) => [r.post_id, r.n]));
    const mineSet = new Set((await q(db, `SELECT post_id FROM post_likes WHERE uid = ? AND post_id IN ${ids}`, user.uid).all()).results.map((r) => r.post_id));
    const cmts = new Map();
    for (const c of (await q(db, `SELECT id, post_id, author, text, created_at AS at, (uid = ?) AS mine FROM post_comments WHERE deleted = 0 AND post_id IN ${ids} ORDER BY id LIMIT 2000`, user.uid).all()).results) {
      if (!cmts.has(c.post_id)) cmts.set(c.post_id, []);
      cmts.get(c.post_id).push({ id: c.id, author: c.author, text: c.text, at: c.at, mine: !!c.mine });
    }
    return { posts: rows.map((p) => ({ ...p, admin: !!p.admin, mine: !!p.mine, likes: likes.get(p.id) || 0, liked: mineSet.has(p.id), comments: cmts.get(p.id) || [] })) };
  });
  const approvedPost = async (db, id) => {
    if (!Number.isInteger(id) || id < 1) throw new HttpError(404, 'not-found');
    if (!(await q(db, "SELECT 1 AS x FROM posts WHERE id = ? AND status = 'approved'", id).first())) throw new HttpError(404, 'not-found');
  };
  route('POST', '/posts/:id/like', 'user', async ({ db, user, t, params, body }) => {
    const id = +params.id;
    await approvedPost(db, id);
    if (typeof body.liked !== 'boolean') throw bad('bad-request');
    if (body.liked) await q(db, 'INSERT OR IGNORE INTO post_likes (post_id, uid, created_at) VALUES (?, ?, ?)', id, user.uid, t).run();
    else await q(db, 'DELETE FROM post_likes WHERE post_id = ? AND uid = ?', id, user.uid).run();
    return { ok: true, likes: (await q(db, 'SELECT COUNT(*) AS n FROM post_likes WHERE post_id = ?', id).first()).n, liked: body.liked };
  });
  route('POST', '/posts/:id/comments', 'user', async ({ db, user, t, params, body }) => {
    const id = +params.id;
    await approvedPost(db, id);
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > E.MAX_COMMENT_LEN) throw bad('bad-text');
    const n = await q(db, 'SELECT COUNT(*) AS n FROM post_comments WHERE uid = ? AND created_at > ?', user.uid, t - 86400000).first();
    if (n.n >= E.MAX_COMMENTS_PER_DAY) throw new HttpError(429, 'too-many-comments');
    const r = await q(db, 'INSERT INTO post_comments (post_id, uid, author, text, created_at) VALUES (?, ?, ?, ?, ?)', id, user.uid, user.name || 'Người dùng', text, t).run();
    return { ok: true, id: r.meta.last_row_id };
  });
  route('POST', '/comments/:id/delete', 'user', async ({ db, user, params }) => {
    const r = user.admin
      ? await q(db, 'UPDATE post_comments SET deleted = 1 WHERE id = ? AND deleted = 0', +params.id).run()
      : await q(db, 'UPDATE post_comments SET deleted = 1 WHERE id = ? AND uid = ? AND deleted = 0', +params.id, user.uid).run();
    if (!r.meta.changes) throw new HttpError(404, 'not-found');
    return { ok: true };
  });
  route('POST', '/posts/:id/delete', 'user', async ({ db, user, params }) => {
    const r = user.admin
      ? await q(db, "UPDATE posts SET status = 'deleted' WHERE id = ? AND status != 'deleted'", +params.id).run()
      : await q(db, "UPDATE posts SET status = 'deleted' WHERE id = ? AND uid = ? AND status != 'deleted'", +params.id, user.uid).run();
    if (!r.meta.changes) throw new HttpError(404, 'not-found');
    return { ok: true };
  });

  route('GET', '/admin/posts', 'admin', async ({ db }) => ({
    posts: (await q(db, "SELECT id, uid, author, text, tag, status, created_at FROM posts WHERE status = 'pending' ORDER BY id LIMIT 200").all()).results,
  }));

  for (const [action, status] of [['approve', 'approved'], ['reject', 'rejected']]) {
    route('POST', `/admin/posts/:id/${action}`, 'admin', async ({ db, user, t, params }) => {
      const r = await q(db, "UPDATE posts SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ? AND status = 'pending'", status, t, user.uid, +params.id).run();
      if (!r.meta.changes) throw new HttpError(409, 'not-pending');
      return { ok: true };
    });
  }

  route('PUT', '/admin/catalog', 'admin', async ({ db, body }) => {
    if (!Array.isArray(body.items) || body.items.length > 500) throw bad('bad-items');
    const stmts = body.items.map((i) => {
      if (typeof i.id !== 'string' || !i.id || typeof i.name !== 'string' || typeof i.kind !== 'string' || !isInt(i.price, 0, 1e9)) throw bad('bad-item');
      return q(db, 'INSERT INTO catalog (id, kind, name, price) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET kind = excluded.kind, name = excluded.name, price = excluded.price', i.id, i.kind, i.name.slice(0, 120), i.price);
    });
    if (stmts.length) await atomic(db, stmts);
    return { ok: true, count: stmts.length };
  });

  // Nội dung trả phí: chỉ gửi khi người dùng còn Premium VÀ sở hữu khóa học của ngôn ngữ đó (hoặc là admin).
  route('GET', '/content/vocab/:lang', 'user', async ({ db, env, user, t, params }) => {
    if (!E.CONTENT_LANGS.includes(params.lang)) throw new HttpError(404, 'no-content');
    if (!user.admin) {
      const w = await wallet(db, user.uid, t);
      if (!(w.premiumUntil > t)) throw new HttpError(403, 'premium-required');
      const own = await q(db, 'SELECT 1 AS x FROM entitlements WHERE uid = ? AND item_id = ?', user.uid, `access:${params.lang}`).first();
      if (!own) throw new HttpError(403, 'course-required');
    }
    const obj = env.CONTENT ? await env.CONTENT.get(`vocab/${params.lang}.json`) : null;
    if (!obj) throw new HttpError(404, 'no-content');
    return new Response(obj.body);
  });

  // Danh sách nhiệm vụ đặc biệt: admin ghi đè toàn bộ, mọi người dùng đọc được.
  route('PUT', '/admin/tasks', 'admin', async ({ db, body }) => {
    if (!Array.isArray(body.items) || body.items.length > E.MAX_TASKS) throw bad('bad-items');
    const seen = new Set();
    const stmts = [q(db, 'DELETE FROM tasks')];
    for (const i of body.items) {
      if (!i || typeof i.id !== 'string' || !/^[\w-]{1,40}$/.test(i.id) || seen.has(i.id) || typeof i.title !== 'string' || !i.title.trim()
        || !isInt(i.xu, 0, E.MAX_GRANT) || !isInt(i.chips, 0, E.MAX_GRANT) || !isInt(i.money, 0, 1e9) || own(E.TOPUP_RATE, i.cur) === undefined) throw bad('bad-item');
      seen.add(i.id);
      stmts.push(q(db, 'INSERT INTO tasks (id, title, xu, chips, money, cur) VALUES (?, ?, ?, ?, ?, ?)', i.id, i.title.trim().slice(0, 120), i.xu, i.chips, i.money, i.cur));
    }
    await atomic(db, stmts);
    return { ok: true, count: body.items.length };
  });
  route('GET', '/tasks', 'user', async ({ db }) => ({ tasks: (await q(db, 'SELECT id, title, xu, chips, money, cur FROM tasks ORDER BY rowid').all()).results }));

  // ----- Tin rao vặt -----
  const LISTING_FIELDS = { title: [5, 120], price: [1, 80], loc: [1, 220], country: [1, 60], region: [0, 20], addr: [0, 200], desc: [1, 1800], emoji: [0, 8] };
  async function allowedCats(db) {
    const row = await q(db, 'SELECT json FROM store WHERE id = 1').first();
    const custom = row ? JSON.parse(row.json).customCats.map((c) => c.id) : [];
    return new Set([...E.BUILTIN_LISTING_CATS, ...custom]);
  }
  const listingOut = (r, uid) => ({ id: r.id, seller: r.seller, cat: r.cat, title: r.title, price: r.price, loc: r.loc, country: r.country, region: r.region, addr: r.addr, desc: r.descr, emoji: r.emoji, at: r.created_at, mine: r.uid === uid });
  route('POST', '/listings', 'user', async ({ db, user, t, body }) => {
    const v = {};
    for (const [k, [min, max]] of Object.entries(LISTING_FIELDS)) {
      const x = typeof body[k] === 'string' ? body[k].trim() : '';
      if (x.length < min || x.length > max) throw bad('bad-listing');
      v[k] = x;
    }
    if (!(await allowedCats(db)).has(body.cat)) throw bad('bad-listing');
    const n = await q(db, "SELECT COUNT(*) AS n FROM listings WHERE uid = ? AND created_at > ? AND status != 'deleted'", user.uid, t - 86400000).first();
    if (n.n >= E.MAX_LISTINGS_PER_DAY) throw new HttpError(429, 'too-many-posts');
    const adm = user.admin ? 'approved' : 'pending';
    const r = await q(db, 'INSERT INTO listings (uid, seller, cat, title, price, loc, country, region, addr, descr, emoji, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', user.uid, user.name || 'Người dùng', body.cat, v.title, v.price, v.loc, v.country, v.region, v.addr, v.desc, v.emoji, adm, t).run();
    return { ok: true, id: r.meta.last_row_id, status: adm };
  });
  route('GET', '/listings', 'user', async ({ db, user }) => {
    const cats = await allowedCats(db);
    const rows = (await q(db, "SELECT * FROM listings WHERE status = 'approved' ORDER BY id DESC LIMIT 300").all()).results;
    return { listings: rows.filter((r) => cats.has(r.cat)).map((r) => listingOut(r, user.uid)) };
  });
  route('POST', '/listings/:id/delete', 'user', async ({ db, user, params }) => {
    const r = user.admin
      ? await q(db, "UPDATE listings SET status = 'deleted' WHERE id = ? AND status != 'deleted'", +params.id).run()
      : await q(db, "UPDATE listings SET status = 'deleted' WHERE id = ? AND uid = ? AND status != 'deleted'", +params.id, user.uid).run();
    if (!r.meta.changes) throw new HttpError(404, 'not-found');
    return { ok: true };
  });
  route('GET', '/admin/listings', 'admin', async ({ db, user }) => ({ listings: (await q(db, "SELECT * FROM listings WHERE status = 'pending' ORDER BY id LIMIT 200").all()).results.map((r) => listingOut(r, user.uid)) }));
  for (const [action, status] of [['approve', 'approved'], ['reject', 'rejected']]) {
    route('POST', `/admin/listings/:id/${action}`, 'admin', async ({ db, params }) => {
      const r = await q(db, "UPDATE listings SET status = ? WHERE id = ? AND status = 'pending'", status, +params.id).run();
      if (!r.meta.changes) throw new HttpError(409, 'not-pending');
      return { ok: true };
    });
  }

  async function authenticate(request, env) {
    const auth = request.headers.get('authorization') || '';
    try { return await verify(auth.startsWith('Bearer ') ? auth.slice(7) : '', env); } catch { throw new HttpError(401, 'unauthenticated'); }
  }

  // Cấu hình cửa hàng: mọi người đọc, chỉ admin ghi (bản đã làm sạch, từ chối cả gói nếu có phần tử sai).
  route('PUT', '/admin/store', 'admin', async ({ db, t, body }) => {
    const clean = sanitizeStore(body);
    if (!clean) throw bad('bad-store');
    await q(db, 'INSERT INTO store (id, json, updated_at) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at', JSON.stringify(clean), t).run();
    return { ok: true };
  });
  route('GET', '/store', 'user', async ({ db }) => {
    const row = await q(db, 'SELECT json, updated_at FROM store WHERE id = 1').first();
    return row ? { ...JSON.parse(row.json), updatedAt: row.updated_at } : { customProducts: [], productEdits: {}, hiddenProducts: [], customCats: [], updatedAt: 0 };
  });

  return async function handle(request, env) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || '';
    const headers = {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'access-control-allow-origin': origin,
      'access-control-allow-headers': 'authorization, content-type, x-device-id',
      'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
      vary: 'origin',
    };
    const reply = (status, body) => new Response(body === null ? null : JSON.stringify(body), { status, headers });
    if (request.method === 'OPTIONS') return reply(204, null);
    try {
      if (!origin) throw new HttpError(500, 'not-configured');
      const reqOrigin = request.headers.get('origin');
      if (reqOrigin && reqOrigin !== origin) throw new HttpError(403, 'bad-origin');
      if (request.method === 'GET' && url.pathname.startsWith('/img/')) {
        // Ảnh sản phẩm: công khai, tên theo nội dung nên cache vĩnh viễn được.
        const key = url.pathname.slice(1);
        const obj = IMG_KEY.test(key) && env.CONTENT ? await env.CONTENT.get(key) : null;
        if (!obj) throw new HttpError(404, 'not-found');
        return new Response(obj.body, { headers: { 'content-type': IMAGE_TYPES[key.split('.').pop()], 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff', 'cross-origin-resource-policy': 'cross-origin', 'content-security-policy': "default-src 'none'; sandbox" } });
      }
      if (request.method === 'PUT' && url.pathname === '/admin/image') {
        const user = await authenticate(request, env);
        if (!user.admin) throw new HttpError(403, 'forbidden');
        const bytes = new Uint8Array(await request.arrayBuffer());
        if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'too-large');
        const ext = sniffImage(bytes);
        if (!ext) throw new HttpError(400, 'bad-image');
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const key = `img/${[...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('')}.${ext}`;
        if (!env.CONTENT) throw new HttpError(500, 'not-configured');
        await env.CONTENT.put(key, bytes, { httpMetadata: { contentType: IMAGE_TYPES[ext] } });
        return reply(200, { ok: true, key });
      }
      const match = routes.map((r) => ({ r, m: r.method === request.method ? r.re.exec(url.pathname) : null })).find((x) => x.m);
      if (!match) throw new HttpError(404, 'not-found');
      const user = await authenticate(request, env);
      if (match.r.auth === 'admin' && !user.admin) throw new HttpError(403, 'forbidden');
      // Giới hạn thiết bị: mọi yêu cầu của người dùng thường phải kèm X-Device-Id hợp lệ; admin không bị giới hạn.
      const deviceId = request.headers.get('x-device-id') || '';
      if (!user.admin) {
        if (!DEVICE_RE.test(deviceId)) throw new HttpError(400, 'bad-device');
        await registerDevice(env.DB, user.uid, deviceId, now());
      }
      const body = request.method === 'GET' ? {} : await readBody(request, match.r.auth === 'admin' ? 65536 : 8192);
      const out = await match.r.fn({ db: env.DB, env, user, t: now(), body, url, deviceId, params: match.m.groups || {} });
      if (out instanceof Response) return new Response(out.body, { status: out.status, headers }); // nội dung thô (bài học), vẫn kèm CORS/no-store
      return reply(200, out);
    } catch (e) {
      if (e instanceof HttpError) return reply(e.status, { error: e.code });
      console.error('internal', e && e.message);
      return reply(500, { error: 'internal' });
    }
  };
}
