import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApp, PROJECT } from './helpers.mjs';
import { verifyFirebaseToken } from '../src/auth.js';

const DAY = 86400000;
const topup = async (app, uid, amount = 100000) => {
  const o = await app.call('POST', '/orders', { uid, body: { kind: 'topup', currency: 'VND', amount } });
  assert.equal(o.status, 200);
  const a = await app.call('POST', `/admin/orders/${o.json.id}/approve`, { uid: 'boss', admin: true });
  assert.equal(a.status, 200);
};

test('xác thực: thiếu/giả token bị 401; token ký sai, hết hạn, sai aud/iss bị từ chối', async () => {
  const app = await makeApp();
  assert.equal((await app.call('GET', '/me')).status, 401);
  assert.equal((await app.call('GET', '/me', { token: 'a.b.c' })).status, 401);
  const other = await (await import('./helpers.mjs')).makeIssuer(() => app.state.t);
  const forged = await other.sign({ sub: 'u1' });
  assert.equal((await app.call('GET', '/me', { token: forged })).status, 401);
  const now = app.state.t;
  const jwks = [app.issuer.jwk];
  const v = (t) => verifyFirebaseToken(t, { projectId: PROJECT, now, jwks });
  await assert.rejects(v(await app.issuer.sign({ sub: 'u', exp: Math.floor(now / 1000) - 5 })), /expired/);
  await assert.rejects(v(await app.issuer.sign({ sub: 'u', aud: 'khac' })), /bad-aud/);
  await assert.rejects(v(await app.issuer.sign({ sub: 'u', iss: 'https://evil' })), /bad-iss/);
  await assert.rejects(v(await app.issuer.sign({ sub: 'u' }, { alg: 'none' })), /bad-alg/);
  const ok = await v(await app.issuer.sign({ sub: 'u', admin: true }));
  assert.equal(ok.admin, true);
  assert.equal((await v(await app.issuer.sign({ sub: 'u', admin: 'true' }))).admin, false);
});

test('CORS: origin lạ bị chặn', async () => {
  const app = await makeApp();
  const r = await app.call('GET', '/me', { uid: 'u1', origin: 'https://evil.test' });
  assert.equal(r.status, 403);
});

test('ví mới bằng 0; client không thể tự đặt số dư', async () => {
  const app = await makeApp();
  const me = await app.call('GET', '/me', { uid: 'u1' });
  assert.equal(me.json.balance, 0);
  for (const path of ['/wallet', '/me/balance', '/admin/credit']) assert.notEqual((await app.call('POST', path, { uid: 'u1', body: { balance: 1e9 } })).status, 200);
  assert.equal(app.balance('u1').balance, 0);
});

test('nạp tiền: pending không cộng Xu; người thường không duyệt được; admin duyệt cộng đúng một lần', async () => {
  const app = await makeApp();
  const o = await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'topup', currency: 'VND', amount: 100000 } });
  assert.equal((await app.call('GET', '/me', { uid: 'u1' })).json.balance, 0);
  assert.equal((await app.call('POST', `/admin/orders/${o.json.id}/approve`, { uid: 'u1' })).status, 403);
  assert.equal((await app.call('POST', `/admin/orders/${o.json.id}/approve`, { uid: 'u1', body: { admin: true } })).status, 403);
  assert.equal((await app.call('POST', `/admin/orders/${o.json.id}/approve`, { uid: 'boss', admin: true })).status, 200);
  assert.equal(app.balance('u1').balance, 100000);
  assert.equal((await app.call('POST', `/admin/orders/${o.json.id}/approve`, { uid: 'boss', admin: true })).status, 409);
  assert.equal(app.balance('u1').balance, 100000);
});

test('duyệt đơn song song chỉ cộng một lần', async () => {
  const app = await makeApp();
  const o = await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'topup', currency: 'KRW', amount: 5000 } });
  const rs = await Promise.all(Array.from({ length: 5 }, () => app.call('POST', `/admin/orders/${o.json.id}/approve`, { uid: 'boss', admin: true })));
  assert.equal(rs.filter((r) => r.status === 200).length, 1);
  assert.equal(app.balance('u1').balance, 5000 * 19);
});

test('đơn nạp: số tiền do máy chủ tính; số lẻ, quá nhỏ, tiền tệ lạ bị từ chối', async () => {
  const app = await makeApp();
  for (const body of [
    { kind: 'topup', currency: 'VND', amount: 100 }, { kind: 'topup', currency: 'VND', amount: 50000.5 },
    { kind: 'topup', currency: 'USD', amount: 50000 }, { kind: 'topup', currency: 'VND', amount: -50000 },
    { kind: 'topup', currency: 'VND', amount: '50000' }, { kind: 'topup', currency: 'VND', amount: 1e12 },
    { kind: 'plan', planId: 'free' }, { kind: 'xyz' },
  ]) assert.equal((await app.call('POST', '/orders', { uid: 'u1', body })).status, 400, JSON.stringify(body));
  const o = await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'topup', currency: 'VND', amount: 50000, xu: 1e9 } });
  const row = app.db.sqlite.prepare('SELECT xu FROM orders WHERE id = ?').get(o.json.id);
  assert.equal(row.xu, 50000);
});

test('giới hạn số đơn đang chờ', async () => {
  const app = await makeApp();
  for (let i = 0; i < 5; i++) assert.equal((await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'topup', currency: 'VND', amount: 30000 } })).status, 200);
  assert.equal((await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'topup', currency: 'VND', amount: 30000 } })).status, 429);
});

test('Premium: giá/số tháng do máy chủ; gia hạn cộng dồn; cộng chip', async () => {
  const app = await makeApp();
  const o1 = await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'plan', planId: '1m', amount: 1, months: 999 } });
  await app.call('POST', `/admin/orders/${o1.json.id}/approve`, { uid: 'boss', admin: true });
  const t = app.state.t;
  assert.equal(app.balance('u1').p, t + 30 * DAY);
  assert.equal(app.balance('u1').chips, 10000);
  const o2 = await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'plan', planId: '3m' } });
  await app.call('POST', `/admin/orders/${o2.json.id}/approve`, { uid: 'boss', admin: true });
  assert.equal(app.balance('u1').p, t + 120 * DAY);
});

test('từ chối đơn không cộng gì; không duyệt lại đơn đã từ chối', async () => {
  const app = await makeApp();
  const o = await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'topup', currency: 'VND', amount: 30000 } });
  assert.equal((await app.call('POST', `/admin/orders/${o.json.id}/reject`, { uid: 'boss', admin: true })).status, 200);
  assert.equal((await app.call('POST', `/admin/orders/${o.json.id}/approve`, { uid: 'boss', admin: true })).status, 409);
  assert.equal((await app.call('GET', '/me', { uid: 'u1' })).json.balance, 0);
});

test('đơn mua hàng: thưởng nhiệm vụ một lần/ngày, ưu đãi lớn theo ngưỡng', async () => {
  const app = await makeApp();
  const mk = async (amount) => (await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'shop', currency: 'VND', amount } })).json.id;
  const a = await mk(20000), b = await mk(60000);
  await app.call('POST', `/admin/orders/${a}/approve`, { uid: 'boss', admin: true });
  assert.deepEqual({ ...app.balance('u1') }, { balance: 10000, chips: 10000, p: 0 });
  await app.call('POST', `/admin/orders/${b}/approve`, { uid: 'boss', admin: true });
  assert.equal(app.balance('u1').balance, 10000 + 40000); // t-shop đã nhận hôm nay, chỉ thêm bigshop
  const c = await mk(60000);
  await app.call('POST', `/admin/orders/${c}/approve`, { uid: 'boss', admin: true });
  assert.equal(app.balance('u1').balance, 50000); // không nhận lại trong ngày
});

test('mua hàng trong catalog: trừ đúng giá máy chủ; thiếu Xu thì hủy toàn bộ; không mua trùng', async () => {
  const app = await makeApp();
  assert.equal((await app.call('PUT', '/admin/catalog', { uid: 'u1', body: { items: [] } })).status, 403);
  await app.call('PUT', '/admin/catalog', { uid: 'boss', admin: true, body: { items: [{ id: 'av1', kind: 'avatar', name: 'Avatar 1', price: 40000 }] } });
  const poor = await app.call('POST', '/purchase', { uid: 'u1', body: { itemId: 'av1', price: 0 } });
  assert.equal(poor.status, 402);
  assert.equal(app.db.sqlite.prepare('SELECT COUNT(*) n FROM entitlements').get().n, 0);
  assert.equal(app.db.sqlite.prepare("SELECT COUNT(*) n FROM tx WHERE kind='spend'").get().n, 0);
  await topup(app, 'u1', 50000);
  assert.equal((await app.call('POST', '/purchase', { uid: 'u1', body: { itemId: 'av1', price: 0 } })).status, 200);
  assert.equal(app.balance('u1').balance, 10000);
  assert.equal((await app.call('POST', '/purchase', { uid: 'u1', body: { itemId: 'av1' } })).status, 409);
  assert.equal(app.balance('u1').balance, 10000);
  assert.equal((await app.call('POST', '/purchase', { uid: 'u1', body: { itemId: 'khong-co' } })).status, 404);
});

test('mua song song không âm số dư, không mua hai lần', async () => {
  const app = await makeApp();
  await app.call('PUT', '/admin/catalog', { uid: 'boss', admin: true, body: { items: [{ id: 'a', kind: 'k', name: 'A', price: 30000 }, { id: 'b', kind: 'k', name: 'B', price: 30000 }] } });
  await topup(app, 'u1', 50000);
  const rs = await Promise.all([app.call('POST', '/purchase', { uid: 'u1', body: { itemId: 'a' } }), app.call('POST', '/purchase', { uid: 'u1', body: { itemId: 'b' } })]);
  assert.equal(rs.filter((r) => r.status === 200).length, 1);
  assert.equal(app.balance('u1').balance, 20000);
});

test('nhiệm vụ ngày: một lần/ngày, ngày mới nhận lại, nhiệm vụ lạ bị từ chối, không tự đặt thưởng', async () => {
  const app = await makeApp();
  assert.equal((await app.call('POST', '/claim', { uid: 'u1', body: { taskId: 't-checkin', xu: 1e9 } })).status, 200);
  assert.equal(app.balance('u1').balance, 200);
  assert.equal((await app.call('POST', '/claim', { uid: 'u1', body: { taskId: 't-checkin' } })).status, 409);
  assert.equal((await app.call('POST', '/claim', { uid: 'u1', body: { taskId: 't-hack' } })).status, 400);
  app.state.t += DAY;
  assert.equal((await app.call('POST', '/claim', { uid: 'u1', body: { taskId: 't-checkin' } })).status, 200);
  assert.equal(app.balance('u1').balance, 400);
  const par = await Promise.all(Array.from({ length: 6 }, () => app.call('POST', '/claim', { uid: 'u2', body: { taskId: 't-lessons' } })));
  assert.equal(par.filter((r) => r.status === 200).length, 1);
  assert.equal(app.balance('u2').balance, 200);
});

test('đổi chip: cần ngày sinh, đủ tuổi, đúng hạn mức, không vượt khi gửi song song', async () => {
  const app = await makeApp();
  await topup(app, 'u1', 1e6);
  assert.equal((await app.call('POST', '/chips/exchange', { uid: 'u1', body: { xu: 1000 } })).status, 403);
  assert.equal((await app.call('POST', '/profile/birth', { uid: 'u1', body: { birth: '2999-01-01' } })).status, 400);
  assert.equal((await app.call('POST', '/profile/birth', { uid: 'u1', body: { birth: '2020-01-01' } })).status, 200);
  assert.equal((await app.call('POST', '/profile/birth', { uid: 'u1', body: { birth: '1990-01-01' } })).status, 409); // không khai lại tuổi
  assert.equal((await app.call('POST', '/chips/exchange', { uid: 'u1', body: { xu: 1000 } })).status, 403); // 6 tuổi
  // 15 tuổi: hạn mức 100.000 chip/ngày
  await topup(app, 'u2', 1e6);
  await topup(app, 'u2', 1e6);
  await app.call('POST', '/profile/birth', { uid: 'u2', body: { birth: '2011-01-01' } });
  for (const xu of [-5, 0, 1.5, '100', 1e10]) assert.equal((await app.call('POST', '/chips/exchange', { uid: 'u2', body: { xu } })).status, 400);
  const rs = await Promise.all(Array.from({ length: 5 }, () => app.call('POST', '/chips/exchange', { uid: 'u2', body: { xu: 30000 } })));
  assert.equal(rs.filter((r) => r.status === 200).length, 3); // 3 x 30.000 <= 100.000
  assert.equal(app.balance('u2').chips, 90000);
  assert.equal(app.balance('u2').balance, 2e6 - 90000);
  app.state.t += DAY;
  assert.equal((await app.call('POST', '/chips/exchange', { uid: 'u2', body: { xu: 30000 } })).status, 200);
});

test('đổi chip vượt số Xu đang có bị từ chối và không đổi gì', async () => {
  const app = await makeApp();
  await topup(app, 'u1', 30000);
  await app.call('POST', '/profile/birth', { uid: 'u1', body: { birth: '1990-01-01' } });
  assert.equal((await app.call('POST', '/chips/exchange', { uid: 'u1', body: { xu: 30001 } })).status, 402);
  assert.deepEqual({ ...app.balance('u1') }, { balance: 30000, chips: 0, p: 0 });
  assert.equal(app.db.sqlite.prepare('SELECT COUNT(*) n FROM chip_daily').get().n, 0); // hủy cả lô, kể cả hạn mức ngày
});

test('kiểm duyệt bài: pending không hiện; chỉ admin duyệt; giới hạn độ dài và tần suất', async () => {
  const app = await makeApp();
  const p = await app.call('POST', '/posts', { uid: 'u1', body: { text: '<img src=x onerror=alert(1)>' } });
  assert.equal(p.status, 200);
  assert.equal((await app.call('GET', '/posts', { uid: 'u2' })).json.posts.length, 0);
  assert.equal((await app.call('POST', `/admin/posts/${p.json.id}/approve`, { uid: 'u1' })).status, 403);
  assert.equal((await app.call('POST', `/admin/posts/${p.json.id}/approve`, { uid: 'boss', admin: true })).status, 200);
  assert.equal((await app.call('GET', '/posts', { uid: 'u2' })).json.posts.length, 1);
  assert.equal((await app.call('POST', '/posts', { uid: 'u1', body: { text: 'x'.repeat(2001) } })).status, 400);
  assert.equal((await app.call('POST', '/posts', { uid: 'u1', body: { text: '   ' } })).status, 400);
  for (let i = 0; i < 9; i++) await app.call('POST', '/posts', { uid: 'u1', body: { text: 'aaa' } });
  assert.equal((await app.call('POST', '/posts', { uid: 'u1', body: { text: 'aaa' } })).status, 429);
});

test('SQL injection trong tham số chỉ là dữ liệu', async () => {
  const app = await makeApp();
  await app.call('POST', '/posts', { uid: "u1'; DROP TABLE wallets;--", body: { text: "x'); DROP TABLE tx;--" } });
  assert.equal((await app.call('GET', '/me', { uid: 'u1' })).status, 200);
  assert.equal((await app.call('POST', '/admin/orders/1%20OR%201=1/approve', { uid: 'boss', admin: true })).status, 404);
});

test('người dùng chỉ thấy đơn và lịch sử của chính mình', async () => {
  const app = await makeApp();
  await topup(app, 'u1', 50000);
  const other = await app.call('GET', '/orders/mine', { uid: 'u2' });
  assert.equal(other.json.orders.length, 0);
  assert.equal((await app.call('GET', '/me', { uid: 'u2' })).json.history.length, 0);
  assert.equal((await app.call('GET', '/admin/orders', { uid: 'u2' })).status, 403);
});

test('đơn hàng lưu mô tả và thông tin liên hệ đã lọc; admin thấy, người dùng chỉ thấy mô tả', async () => {
  const app = await makeApp();
  const body = { kind: 'shop', currency: 'VND', amount: 250000, code: 'ABC', summary: '  2 sản phẩm WIND Store  ', contact: { address: 'Hà Nội', phone: '0900', docEmail: 'a@b.vn', evil: '<script>', password: '123' } };
  const o = await app.call('POST', '/orders', { uid: 'u1', body });
  assert.equal(o.status, 200);
  const mine = (await app.call('GET', '/orders/mine', { uid: 'u1' })).json.orders[0];
  assert.equal(mine.summary, '2 sản phẩm WIND Store');
  assert.equal(mine.contact, undefined, 'người dùng không cần đọc lại thông tin liên hệ');
  const row = (await app.call('GET', '/admin/orders', { uid: 'boss', admin: true })).json.orders[0];
  assert.deepEqual(JSON.parse(row.contact), { address: 'Hà Nội', phone: '0900', docEmail: 'a@b.vn' });
  const long = await app.call('POST', '/orders', { uid: 'u2', body: { kind: 'shop', currency: 'VND', amount: 1000, summary: 'x'.repeat(500) } });
  assert.equal(long.status, 200);
  assert.equal((await app.call('GET', '/orders/mine', { uid: 'u2' })).json.orders[0].summary.length, 200);
});

test('admin cộng thưởng: chỉ admin, số hợp lệ, có dòng sổ ghi người cộng', async () => {
  const app = await makeApp();
  const grant = (uid, body, who = { uid: 'boss', admin: true }) => app.call('POST', '/admin/grant', { ...who, body: { uid, ...body } });
  assert.equal((await grant('u1', { xu: 500 }, { uid: 'u1' })).status, 403);
  assert.equal((await grant('u1', { xu: 500 }, { uid: 'u1', body: undefined })).status, 403);
  for (const bad of [{}, { xu: 0 }, { xu: -5 }, { xu: 1.5 }, { xu: '100' }, { xu: 1e9 }, { chips: -1 }, { xu: 5, chips: 1e9 }]) {
    assert.equal((await grant('u1', bad)).status, 400, JSON.stringify(bad));
  }
  assert.equal((await grant('', { xu: 5 })).status, 400);
  assert.equal((await grant('u1', { xu: 500, chips: 70, note: 'Thưởng sự kiện' })).status, 200);
  assert.deepEqual({ ...app.balance('u1') }, { balance: 500, chips: 70, p: 0 });
  const me = (await app.call('GET', '/me', { uid: 'u1' })).json;
  assert.equal(me.history[0].title, 'Thưởng sự kiện');
  const ref = app.db.sqlite.prepare("SELECT ref FROM tx WHERE uid = 'u1'").get().ref;
  assert.equal(ref, 'admin:boss');
});

test('admin cộng thưởng theo email đã xác thực; email lạ trả 404', async () => {
  const app = await makeApp();
  await app.call('GET', '/me', { token: await app.as('u1', { email: 'An@Gmail.com', email_verified: true }) });
  const grant = (body) => app.call('POST', '/admin/grant', { uid: 'boss', admin: true, body });
  assert.equal((await grant({ email: 'an@gmail.com', xu: 700 })).status, 200);
  assert.equal(app.balance('u1').balance, 700);
  assert.equal((await grant({ email: 'khong@co.vn', xu: 5 })).status, 404);
});

test('duyệt đơn kèm quyền lợi: chỉ mã có trong catalog, không trùng, tất cả hoặc không gì cả', async () => {
  const app = await makeApp();
  await app.call('PUT', '/admin/catalog', { uid: 'boss', admin: true, body: { items: [{ id: 'doc-en', kind: 'doc', name: 'Tài liệu EN', price: 80000 }, { id: 'course-1', kind: 'course', name: 'Khóa 1', price: 1 }] } });
  const order = async () => (await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'shop', currency: 'VND', amount: 100000 } })).json.id;
  const approve = (id, body) => app.call('POST', `/admin/orders/${id}/approve`, { uid: 'boss', admin: true, body });
  const first = await order();
  assert.equal((await approve(first, { grants: ['doc-en', 'ma-gia'] })).status, 400);
  assert.equal((await app.call('GET', '/me', { uid: 'u1' })).json.owned.length, 0, 'lỗi thì không cấp gì');
  assert.equal((await approve(first, { grants: 'doc-en' })).status, 400);
  assert.equal((await approve(first, { grants: ['doc-en', 'doc-en', 'course-1'] })).status, 200);
  assert.deepEqual((await app.call('GET', '/me', { uid: 'u1' })).json.owned.sort(), ['course-1', 'doc-en']);
  assert.equal((await approve(await order(), { grants: Array.from({ length: 11 }, (_, i) => 'x' + i) })).status, 400);
});

test('đơn mua hàng: admin kèm Xu/chip/Premium có trần; loại đơn khác từ chối; lỗi thì không đổi gì', async () => {
  const app = await makeApp();
  const shop = async (body = {}) => (await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'shop', currency: 'VND', amount: 60000, lines: [{ id: 'p1', qty: 2 }, { id: '', qty: 1 }, { id: 'p2', qty: 0 }, { id: 'p3', qty: 100 }], ...body } })).json.id;
  const approve = (id, body, uid = 'boss') => app.call('POST', `/admin/orders/${id}/approve`, { uid, admin: true, body });
  const id = await shop();
  const stored = (await app.call('GET', '/admin/orders', { uid: 'boss', admin: true })).json.orders[0];
  assert.deepEqual(JSON.parse(stored.lines), [{ id: 'p1', qty: 2 }], 'chỉ giữ dòng hợp lệ');
  for (const bad of [{ xu: -1 }, { xu: 1e9 }, { chips: 1.5 }, { premiumMonths: 1201 }, { premiumMonths: '3' }]) assert.equal((await approve(id, bad)).status, 400, JSON.stringify(bad));
  assert.equal(app.balance('u1'), undefined, 'lỗi thì ví không đổi');
  assert.equal((await approve(id, { xu: 5000, chips: 300, premiumMonths: 3 })).status, 200);
  const w = app.balance('u1');
  assert.equal(w.balance, 5000 + 50000, 'Xu admin kèm + thưởng mua hàng tự động (đơn từ 50.000đ nhận cả thưởng đơn lớn)');
  assert.equal(w.chips, 300 + 50000);
  assert.ok(w.p >= app.state.t + 3 * 30 * 86400000);
  const topup = (await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'topup', currency: 'VND', amount: 50000 } })).json.id;
  assert.equal((await approve(topup, { xu: 999999 })).status, 400, 'đơn nạp Xu do máy chủ tính, admin không đổi được');
  assert.equal((await approve(topup, {})).status, 200);
});

test('quyền học theo khóa access:<ngôn ngữ> chỉ cấp được qua admin duyệt đơn, không mua lẻ được', async () => {
  const app = await makeApp();
  const id = (await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'shop', currency: 'VND', amount: 1000 } })).json.id;
  const approve = (grants) => app.call('POST', `/admin/orders/${id}/approve`, { uid: 'boss', admin: true, body: { grants } });
  assert.equal((await approve(['access:english'])).status, 400);
  assert.equal((await approve(['access:EN'])).status, 400);
  assert.equal((await approve(['access:en', 'access:ko'])).status, 200);
  assert.deepEqual((await app.call('GET', '/me', { uid: 'u1' })).json.owned.sort(), ['access:en', 'access:ko']);
  assert.equal((await app.call('POST', '/purchase', { uid: 'u2', body: { itemId: 'access:en' } })).status, 404, 'không có trong catalog nên không mua được');
});

test('thưởng chia sẻ Facebook: link hợp lệ, mỗi kỳ một lần, link không dùng lại, từ chối thì nộp lại được, thưởng do máy chủ định', async () => {
  const app = await makeApp();
  const day = new Date(app.state.t + 7 * 36e5).toISOString().slice(0, 10);
  const cur = `${day.slice(0, 7)}-${+day.slice(8) <= 15 ? 'a' : 'b'}`, other = cur.endsWith('a') ? cur.slice(0, 8) + 'b' : cur.slice(0, 8) + 'a';
  const send = (uid, link, period = cur) => app.call('POST', '/orders', { uid, body: { kind: 'fbshare', link, period, amount: 99999999 } });
  const link = 'https://www.facebook.com/user/posts/123';
  assert.equal((await send('u1', 'http://facebook.com/x/y')).status, 400, 'phải https');
  assert.equal((await send('u1', 'https://evil.com/facebook.com/x')).status, 400);
  assert.equal((await send('u1', link, 'ky-bat-ky')).status, 400);
  const first = await send('u1', link);
  assert.equal(first.status, 200);
  assert.equal((await send('u1', 'https://facebook.com/other/2')).status, 409, 'cùng kỳ chỉ một lần');
  assert.equal((await send('u2', link + '/')).status, 409, 'link đã được người khác dùng');
  assert.equal((await send('u1', 'https://facebook.com/other/2', other)).status, 400, 'chỉ nhận kỳ hiện tại');
  assert.equal((await app.call('POST', `/admin/orders/${first.json.id}/approve`, { uid: 'u1' })).status, 403, 'người thường không duyệt');
  assert.equal((await app.call('POST', `/admin/orders/${first.json.id}/approve`, { uid: 'boss', admin: true, body: { xu: 5 } })).status, 400, 'admin không đổi được mức thưởng');
  assert.equal((await app.call('POST', `/admin/orders/${first.json.id}/approve`, { uid: 'boss', admin: true })).status, 200);
  assert.equal(app.balance('u1').balance, 1000);
  assert.equal((await app.call('POST', `/admin/orders/${first.json.id}/approve`, { uid: 'boss', admin: true })).status, 409);
  const r2 = await send('u3', 'https://facebook.com/u3/9');
  assert.equal((await app.call('POST', `/admin/orders/${r2.json.id}/reject`, { uid: 'boss', admin: true })).status, 200);
  assert.equal((await send('u3', 'https://facebook.com/u3/9')).status, 200, 'bị từ chối thì được nộp lại');
});

test('nhiệm vụ đặc biệt: admin đăng, người dùng nộp một lần, thưởng lấy từ bảng của máy chủ', async () => {
  const app = await makeApp();
  const put = (uid, items, admin) => app.call('PUT', '/admin/tasks', { uid, admin, body: { items } });
  const t1 = { id: 't1', title: 'Chia sẻ video', xu: 700, chips: 50, money: 0, cur: 'VND' };
  assert.equal((await put('u1', [t1], false)).status, 403);
  assert.equal((await put('boss', [{ ...t1, xu: -1 }], true)).status, 400);
  assert.equal((await put('boss', [t1, t1], true)).status, 400, 'trùng id');
  assert.equal((await put('boss', [t1], true)).status, 200);
  assert.equal((await app.call('GET', '/tasks', { uid: 'u1' })).json.tasks.length, 1);
  assert.equal((await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'ctask', taskId: 'khong-co' } })).status, 404);
  const o = await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'ctask', taskId: 't1', xu: 99999999, contact: { bank: '123', holder: 'A' } } });
  assert.equal(o.status, 200);
  assert.equal((await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'ctask', taskId: 't1' } })).status, 409, 'một lần mỗi nhiệm vụ');
  assert.equal((await app.call('POST', `/admin/orders/${o.json.id}/approve`, { uid: 'boss', admin: true })).status, 200);
  const w = app.balance('u1');
  assert.equal(w.balance, 700);
  assert.equal(w.chips, 50);
});

test('nội dung trả phí: cần Premium còn hạn và khóa học của đúng ngôn ngữ; admin xem được; ngôn ngữ lạ 404', async () => {
  const app = await makeApp();
  const get = (uid, lang, admin) => app.call('GET', `/content/vocab/${lang}`, { uid, admin });
  assert.equal((await app.call('GET', '/content/vocab/en')).status, 401);
  assert.equal((await get('u1', 'en')).status, 403, 'chưa có Premium');
  assert.equal((await get('u1', '../../x')).status, 404);
  assert.equal((await get('u1', 'xx')).status, 404);
  // Admin duyệt đơn: Premium 1 tháng + khóa tiếng Anh
  const o = (await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'shop', currency: 'VND', amount: 1000 } })).json.id;
  assert.equal((await app.call('POST', `/admin/orders/${o}/approve`, { uid: 'boss', admin: true, body: { grants: ['access:en'], premiumMonths: 1 } })).status, 200);
  const ok = await get('u1', 'en');
  assert.equal(ok.status, 200);
  assert.equal(ok.json['Sach|0'].length, 2, 'bản đầy đủ có nhiều bài');
  assert.equal((await get('u1', 'ko')).status, 403, 'Premium nhưng chưa có khóa tiếng Hàn');
  assert.equal((await get('boss', 'ko', true)).status, 200, 'admin xem được');
  app.state.t += 40 * 86400000;
  assert.equal((await get('u1', 'en')).status, 403, 'hết hạn Premium thì ngừng gửi');
  assert.equal((await get('boss', 'fr', true)).status, 404, 'chưa tải nội dung lên R2');
});

test('khóa kiểu "constructor"/"__proto__" không lọt qua bảng tra (nhiệm vụ, tiền tệ, gói, nhiệm vụ đặc biệt)', async () => {
  const app = await makeApp();
  for (const id of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    assert.equal((await app.call('POST', '/claim', { uid: 'u1', body: { taskId: id } })).status, 400, `claim ${id}`);
    assert.equal((await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'plan', planId: id } })).status, 400, `plan ${id}`);
    assert.equal((await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'shop', currency: id, amount: 1000 } })).status, 400, `shop ${id}`);
    assert.equal((await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'topup', currency: id, amount: 1000 } })).status, 400, `topup ${id}`);
    const put = await app.call('PUT', '/admin/tasks', { uid: 'boss', admin: true, body: { items: [{ id: 't', title: 'x', xu: 1, chips: 0, money: 0, cur: id }] } });
    assert.equal(put.status, 400, `task cur ${id}`);
  }
  assert.equal(app.balance('u1'), undefined, 'không tạo ví/cộng gì');
});

test('email chỉ được ghi vào ví khi token xác nhận đã xác minh; admin không cộng nhầm cho email chưa xác minh', async () => {
  const app = await makeApp();
  const unverified = await app.as('attacker', { email: 'victim@x.vn', email_verified: false });
  const verified = await app.as('victim', { email: 'victim@x.vn', email_verified: true });
  await app.call('GET', '/me', { token: unverified });
  assert.equal((await app.call('POST', '/admin/grant', { uid: 'boss', admin: true, body: { email: 'victim@x.vn', xu: 100 } })).status, 404, 'email chưa xác minh không dùng được để cộng');
  await app.call('GET', '/me', { token: verified });
  assert.equal((await app.call('POST', '/admin/grant', { uid: 'boss', admin: true, body: { email: 'victim@x.vn', xu: 100 } })).status, 200);
  assert.equal(app.balance('victim').balance, 100);
  assert.equal(app.balance('attacker').balance, 0);
});

test('body lớn: người dùng thường giới hạn 8KB, admin (bảng giá/nhiệm vụ) được 64KB', async () => {
  const app = await makeApp();
  assert.equal((await app.call('POST', '/orders', { uid: 'u1', body: { kind: 'shop', currency: 'VND', amount: 1000, summary: 'x'.repeat(9000) } })).status, 413);
  const items = Array.from({ length: 300 }, (_, i) => ({ id: `item-${i}`, kind: 'avatar', name: 'Avatar số ' + i, price: 1000 + i }));
  assert.ok(JSON.stringify({ items }).length > 8192);
  assert.equal((await app.call('PUT', '/admin/catalog', { uid: 'boss', admin: true, body: { items } })).status, 200);
});

test('khóa công khai Firebase đổi: gặp kid lạ thì tải lại danh sách một lần', async () => {
  const { makeIssuer } = await import('./helpers.mjs');
  const a = await makeIssuer(), b = await makeIssuer();
  b.jwk.kid = 'k2';
  const tokenB = await b.sign({ sub: 'u' }, { kid: 'k2' });
  let calls = 0;
  const fetchFn = async () => { calls++; return new Response(JSON.stringify({ keys: calls === 1 ? [a.jwk] : [a.jwk, b.jwk] })); };
  const opts = { projectId: PROJECT, fetchFn, now: Date.now() };
  assert.equal((await verifyFirebaseToken(await a.sign({ sub: 'u' }), opts)).uid, 'u');
  assert.equal((await verifyFirebaseToken(tokenB, { ...opts, now: opts.now + 61000 })).uid, 'u', 'sau khi xoay khóa vẫn xác thực được');
  assert.equal(calls, 2);
});

test('bài đăng: admin đăng hiện ngay, người dùng chờ duyệt; chỉ chủ bài hoặc admin xóa; bài đã xóa biến mất', async () => {
  const app = await makeApp();
  const own = await app.call('POST', '/posts', { uid: 'u1', body: { text: 'Xin chào mọi người', tag: 'Học tập' } });
  assert.equal(own.json.status, 'pending');
  const adm = await app.call('POST', '/posts', { uid: 'boss', admin: true, body: { text: 'Thông báo từ BigBoss', tag: 'Tin tức' } });
  assert.equal(adm.json.status, 'approved');
  let feed = (await app.call('GET', '/posts', { uid: 'u2' })).json.posts;
  assert.deepEqual(feed.map((p) => [p.tag, p.admin, p.mine]), [['Tin tức', true, false]]);
  assert.equal((await app.call('POST', '/posts', { uid: 'u1', body: { text: 'ok ok', tag: 'x'.repeat(21) } })).status, 400);
  assert.equal((await app.call('POST', '/posts', { uid: 'u1', body: { text: 'ab' } })).status, 400);
  assert.equal((await app.call('POST', `/admin/posts/${own.json.id}/approve`, { uid: 'boss', admin: true })).status, 200);
  assert.equal((await app.call('POST', `/posts/${own.json.id}/delete`, { uid: 'u2' })).status, 404, 'người khác không xóa được');
  feed = (await app.call('GET', '/posts', { uid: 'u1' })).json.posts;
  assert.equal(feed.find((p) => p.id === own.json.id).mine, true);
  assert.equal((await app.call('POST', `/posts/${own.json.id}/delete`, { uid: 'u1' })).status, 200);
  assert.equal((await app.call('POST', `/posts/${adm.json.id}/delete`, { uid: 'u1' })).status, 404);
  assert.equal((await app.call('POST', `/posts/${adm.json.id}/delete`, { uid: 'boss', admin: true })).status, 200);
  assert.equal((await app.call('GET', '/posts', { uid: 'u2' })).json.posts.length, 0);
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

test('ảnh sản phẩm: chỉ admin tải lên, nhận dạng theo nội dung, tên theo hash, phục vụ công khai và an toàn', async () => {
  const app = await makeApp();
  assert.equal((await app.call('PUT', '/admin/image', { uid: 'u1', raw: PNG })).status, 403);
  assert.equal((await app.call('PUT', '/admin/image', { uid: 'boss', admin: true, raw: new TextEncoder().encode('<svg onload=alert(1)>') })).status, 400, 'SVG/HTML bị từ chối');
  assert.equal((await app.call('PUT', '/admin/image', { uid: 'boss', admin: true, raw: new Uint8Array(300 * 1024).fill(0xff) })).status, 413);
  const up = await app.call('PUT', '/admin/image', { uid: 'boss', admin: true, raw: PNG });
  assert.equal(up.status, 200);
  assert.match(up.json.key, /^img\/[0-9a-f]{32}\.png$/);
  const again = await app.call('PUT', '/admin/image', { uid: 'boss', admin: true, raw: PNG });
  assert.equal(again.json.key, up.json.key, 'cùng nội dung cùng khóa');
  const got = await app.call('GET', '/' + up.json.key, {});
  assert.equal(got.status, 200);
  assert.equal(got.headers.get('content-type'), 'image/png');
  assert.match(got.headers.get('cache-control'), /immutable/);
  assert.equal(got.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await app.call('GET', '/img/..%2Fvocab%2Fen.json', {})).status, 404, 'không đọc được khóa ngoài thư mục ảnh');
  assert.equal((await app.call('GET', '/img/' + 'a'.repeat(32) + '.png', {})).status, 404);
});

test('cấu hình cửa hàng: admin ghi, mọi người đọc; dữ liệu sai bị từ chối cả gói', async () => {
  const app = await makeApp();
  const img = (await app.call('PUT', '/admin/image', { uid: 'boss', admin: true, raw: PNG })).json.key;
  const good = {
    customProducts: [{ id: 'px-1', custom: true, name: 'Sách mới', desc: 'Mô tả', price: { VND: 100000, KRW: 5000, JPY: 600 }, cat: 'study', sub: 'books', emoji: '📚', img, ts: 1, rewardXu: 10, rewardChips: 0, evil: '<script>' }],
    productEdits: { 'sp-1': { name: 'Tên mới', price: { VND: 90000 } } },
    hiddenProducts: ['sp-2'],
    customCats: [{ id: 'cat-1', name: 'Đồ ăn', emoji: '🍜' }],
  };
  assert.equal((await app.call('PUT', '/admin/store', { uid: 'u1', body: good })).status, 403);
  assert.equal((await app.call('PUT', '/admin/store', { uid: 'boss', admin: true, body: good })).status, 200);
  const read = (await app.call('GET', '/store', { uid: 'u2' })).json;
  assert.equal(read.customProducts[0].name, 'Sách mới');
  assert.equal(read.customProducts[0].evil, undefined, 'trường lạ bị bỏ');
  assert.equal(read.productEdits['sp-1'].price.VND, 90000);
  assert.deepEqual(read.hiddenProducts, ['sp-2']);
  const bad = (patch) => app.call('PUT', '/admin/store', { uid: 'boss', admin: true, body: { ...good, ...patch } });
  assert.equal((await bad({ customProducts: [{ ...good.customProducts[0], img: 'https://evil.com/x.png' }] })).status, 400, 'ảnh phải là khóa của máy chủ');
  assert.equal((await bad({ customProducts: [{ ...good.customProducts[0], price: { VND: -5, KRW: 1, JPY: 1 } }] })).status, 400);
  assert.equal((await bad({ customProducts: [{ ...good.customProducts[0], id: '../x' }] })).status, 400);
  assert.equal((await bad({ productEdits: { 'sp-1': { rewardXu: 1e12 } } })).status, 400, 'thưởng vượt trần');
  assert.equal((await bad({ customCats: Array.from({ length: 9 }, (_, i) => ({ id: 'c' + i, name: 'Danh mục', emoji: '📌' })) })).status, 400);
  assert.equal((await app.call('GET', '/store', { uid: 'u2' })).json.productEdits['sp-1'].name, 'Tên mới', 'gói sai không ghi đè dữ liệu cũ');
});

// ===== Giới hạn thiết bị =====
const dev = (n) => `device-${n}`.padEnd(16, 'x');

test('thiết bị: tối đa 2 thiết bị mỗi tài khoản, thiết bị thứ 3 bị từ chối, 2 thiết bị cũ vẫn dùng bình thường', async () => {
  const app = await makeApp();
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(1) })).status, 200);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(2) })).status, 200);
  const third = await app.call('GET', '/me', { uid: 'u1', device: dev(3) });
  assert.equal(third.status, 403);
  assert.equal(third.json.error, 'device-limit');
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(1) })).status, 200);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(2) })).status, 200);
  // Tài khoản khác không bị ảnh hưởng, kể cả khi dùng lại cùng mã thiết bị.
  assert.equal((await app.call('GET', '/me', { uid: 'u2', device: dev(3) })).status, 200);
});

test('thiết bị: thiếu hoặc sai định dạng X-Device-Id bị 400; admin không bị giới hạn', async () => {
  const app = await makeApp();
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: '' })).status, 400);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: 'ngan' })).status, 400);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: 'co dau cach va ky tu la !!!' })).status, 400);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: 'x'.repeat(65) })).status, 400);
  for (let i = 1; i <= 4; i++) assert.equal((await app.call('GET', '/me', { uid: 'boss', admin: true, device: dev(i) })).status, 200);
  assert.equal((await app.call('GET', '/me', { uid: 'boss', admin: true, device: '' })).status, 200);
  const none = app.db.sqlite.prepare('SELECT COUNT(*) AS n FROM devices WHERE uid = ?').get('u1');
  assert.equal(none.n, 0);
});

test('thiết bị: nhiều thiết bị mới gửi song song chỉ có đúng 2 thiết bị được nhận; cùng một thiết bị song song đều qua', async () => {
  const app = await makeApp();
  const rs = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => app.call('GET', '/me', { uid: 'u1', device: dev(i) })));
  assert.equal(rs.filter((r) => r.status === 200).length, 2);
  assert.equal(rs.filter((r) => r.status === 403).length, 4);
  assert.equal(app.db.sqlite.prepare('SELECT COUNT(*) AS n FROM devices WHERE uid = ?').get('u1').n, 2);
  const same = await Promise.all([1, 2, 3, 4].map(() => app.call('GET', '/me', { uid: 'u9', device: dev(7) })));
  assert.deepEqual(same.map((r) => r.status), [200, 200, 200, 200]);
});

test('thiết bị: xem danh sách, gỡ thiết bị khác để nhường chỗ, không gỡ được thiết bị đang dùng', async () => {
  const app = await makeApp();
  await app.call('GET', '/me', { uid: 'u1', device: dev(1) });
  await app.call('GET', '/me', { uid: 'u1', device: dev(2) });
  const list = await app.call('GET', '/devices', { uid: 'u1', device: dev(1) });
  assert.equal(list.json.max, 2);
  assert.deepEqual(list.json.devices.map((d) => [d.id, d.current]), [[dev(1), true], [dev(2), false]]);
  assert.equal((await app.call('POST', '/devices/remove', { uid: 'u1', device: dev(1), body: { deviceId: dev(1) } })).status, 400);
  assert.equal((await app.call('POST', '/devices/remove', { uid: 'u1', device: dev(1), body: { deviceId: dev(9) } })).status, 404);
  assert.equal((await app.call('POST', '/devices/remove', { uid: 'u1', device: dev(1), body: { deviceId: 'khong hop le' } })).status, 400);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(3) })).status, 403);
  assert.equal((await app.call('POST', '/devices/remove', { uid: 'u1', device: dev(1), body: { deviceId: dev(2) } })).status, 200);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(3) })).status, 200);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(2) })).status, 403); // thiết bị đã gỡ không còn chỗ
  // Người khác không gỡ được thiết bị của mình.
  await app.call('GET', '/me', { uid: 'u2', device: dev(5) });
  assert.equal((await app.call('POST', '/devices/remove', { uid: 'u2', device: dev(5), body: { deviceId: dev(1) } })).status, 404);
});

test('thiết bị: admin mở khóa cho người dùng; người thường không gọi được', async () => {
  const app = await makeApp();
  await app.call('GET', '/me', { uid: 'u1', device: dev(1) });
  await app.call('GET', '/me', { uid: 'u1', device: dev(2) });
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(3) })).status, 403);
  assert.equal((await app.call('POST', '/admin/devices/reset', { uid: 'u1', body: { uid: 'u1' } })).status, 403);
  const r = await app.call('POST', '/admin/devices/reset', { uid: 'boss', admin: true, body: { uid: 'u1' } });
  assert.deepEqual([r.status, r.json.removed], [200, 2]);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(3) })).status, 200);
});

test('thiết bị: thiết bị không dùng quá 30 ngày nhường chỗ cho thiết bị mới', async () => {
  const app = await makeApp();
  await app.call('GET', '/me', { uid: 'u1', device: dev(1) });
  app.state.t += 20 * DAY;
  await app.call('GET', '/me', { uid: 'u1', device: dev(2) });
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(3) })).status, 403);
  app.state.t += 11 * DAY; // thiết bị 1 đã 31 ngày không dùng, thiết bị 2 mới 11 ngày
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(3) })).status, 200);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(2) })).status, 200);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(1) })).status, 403);
});

// ===== Mã mời =====
const course = async (app, uid, grants = ['access:en']) => {
  const o = await app.call('POST', '/orders', { uid, body: { kind: 'shop', currency: 'VND', amount: 500000 } });
  assert.equal(o.status, 200);
  return app.call('POST', `/admin/orders/${o.json.id}/approve`, { uid: 'boss', admin: true, body: { grants } });
};

test('mã mời: mỗi người đúng một mã 8 ký tự, ổn định, khác nhau giữa các người; tạo song song vẫn một mã', async () => {
  const app = await makeApp();
  const [a1, a2, a3] = await Promise.all([1, 2, 3].map(() => app.call('GET', '/referral', { uid: 'A' })));
  assert.match(a1.json.code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.deepEqual([a2.json.code, a3.json.code], [a1.json.code, a1.json.code]);
  assert.equal((await app.call('GET', '/referral', { uid: 'A' })).json.code, a1.json.code);
  const b = await app.call('GET', '/referral', { uid: 'B' });
  assert.notEqual(b.json.code, a1.json.code);
  assert.deepEqual(a1.json.reward, { xu: 10000, chips: 7000 });
  assert.equal(app.db.sqlite.prepare('SELECT COUNT(*) AS n FROM ref_codes WHERE uid = ?').get('A').n, 1);
  assert.equal((await app.call('GET', '/referral')).status, 401);
});

test('mã mời: nhập mã đúng một lần; không dùng mã của mình, mã lạ, mã sai định dạng; không phân biệt hoa thường/khoảng trắng', async () => {
  const app = await makeApp();
  const codeA = (await app.call('GET', '/referral', { uid: 'A' })).json.code;
  await app.call('GET', '/referral', { uid: 'C' });
  assert.equal((await app.call('POST', '/referral/redeem', { uid: 'A', body: { code: codeA } })).json.error, 'self-referral');
  assert.equal((await app.call('POST', '/referral/redeem', { uid: 'B', body: { code: 'ABCDEFGH' } })).json.error, 'no-code');
  for (const bad of ['', 'abc', 'ABCDEFGHI', 'ABCD-0I1O', null, 123, {}]) assert.equal((await app.call('POST', '/referral/redeem', { uid: 'B', body: { code: bad } })).status, 400);
  assert.equal((await app.call('POST', '/referral/redeem', { uid: 'B', body: { code: ` ${codeA.slice(0, 4).toLowerCase()}-${codeA.slice(4).toLowerCase()} ` } })).status, 200);
  assert.equal((await app.call('POST', '/referral/redeem', { uid: 'B', body: { code: codeA } })).status, 409);
  const codeC = (await app.call('GET', '/referral', { uid: 'C' })).json.code;
  assert.equal((await app.call('POST', '/referral/redeem', { uid: 'B', body: { code: codeC } })).status, 409); // không đổi người mời được
  const ref = await app.call('GET', '/referral', { uid: 'B' });
  assert.equal(ref.json.referredBy, true);
  assert.equal((await app.call('GET', '/referral', { uid: 'A' })).json.invited, 1);
});

test('mã mời: người mời chỉ nhận 10.000 Xu + 7.000 chip SAU KHI người được mời mua khóa học, và chỉ một lần', async () => {
  const app = await makeApp();
  const codeA = (await app.call('GET', '/referral', { uid: 'A' })).json.code;
  await app.call('POST', '/referral/redeem', { uid: 'B', body: { code: codeA } });
  assert.deepEqual([app.balance('A').balance, app.balance('A').chips], [0, 0]); // nhập mã chưa có thưởng
  await topup(app, 'B'); // nạp tiền không phải mua khóa học
  const shopNoCourse = await course(app, 'B', []);
  assert.equal(shopNoCourse.json.referralRewarded, false);
  assert.equal(app.balance('A').balance, 0);
  const first = await course(app, 'B', ['access:en']);
  assert.equal(first.json.referralRewarded, true);
  assert.deepEqual([app.balance('A').balance, app.balance('A').chips], [10000, 7000]);
  const tx = app.db.sqlite.prepare("SELECT kind, delta, chips_delta AS chips, title FROM tx WHERE uid = 'A' AND kind = 'referral'").all();
  assert.deepEqual(tx.map((x) => [x.delta, x.chips]), [[10000, 7000]]);
  const second = await course(app, 'B', ['access:ko']); // mua thêm khóa khác không thưởng thêm
  assert.equal(second.json.referralRewarded, false);
  assert.deepEqual([app.balance('A').balance, app.balance('A').chips], [10000, 7000]);
  const ref = await app.call('GET', '/referral', { uid: 'A' });
  assert.deepEqual([ref.json.invited, ref.json.rewarded], [1, 1]);
});

test('mã mời: hai đơn khóa học của người được mời duyệt song song vẫn chỉ thưởng một lần', async () => {
  const app = await makeApp();
  const codeA = (await app.call('GET', '/referral', { uid: 'A' })).json.code;
  await app.call('POST', '/referral/redeem', { uid: 'B', body: { code: codeA } });
  const ids = [];
  for (let i = 0; i < 2; i++) ids.push((await app.call('POST', '/orders', { uid: 'B', body: { kind: 'shop', currency: 'VND', amount: 500000 } })).json.id);
  await Promise.all(ids.map((id) => app.call('POST', `/admin/orders/${id}/approve`, { uid: 'boss', admin: true, body: { grants: ['access:en'] } })));
  assert.deepEqual([app.balance('A').balance, app.balance('A').chips], [10000, 7000]);
});

test('mã mời: không nhập mã thì không có thưởng; nhập mã sau khi đã mua khóa học bị từ chối; mỗi người được mời cho người mời một khoản riêng', async () => {
  const app = await makeApp();
  const codeA = (await app.call('GET', '/referral', { uid: 'A' })).json.code;
  await course(app, 'X', ['access:en']);
  assert.deepEqual([app.balance('A')?.balance ?? 0], [0]);
  assert.equal((await app.call('POST', '/referral/redeem', { uid: 'X', body: { code: codeA } })).json.error, 'already-purchased');
  for (const uid of ['B', 'C']) {
    assert.equal((await app.call('POST', '/referral/redeem', { uid, body: { code: codeA } })).status, 200);
    await course(app, uid, ['access:ja']);
  }
  assert.deepEqual([app.balance('A').balance, app.balance('A').chips], [20000, 14000]);
});

test('mã mời: đơn bị từ chối không thưởng; người thường không tự đặt quyền học khóa', async () => {
  const app = await makeApp();
  const codeA = (await app.call('GET', '/referral', { uid: 'A' })).json.code;
  await app.call('POST', '/referral/redeem', { uid: 'B', body: { code: codeA } });
  const o = await app.call('POST', '/orders', { uid: 'B', body: { kind: 'shop', currency: 'VND', amount: 500000 } });
  await app.call('POST', `/admin/orders/${o.json.id}/reject`, { uid: 'boss', admin: true });
  assert.equal((await app.call('POST', `/admin/orders/${o.json.id}/approve`, { uid: 'B', body: { grants: ['access:en'] } })).status, 403);
  assert.equal(app.db.sqlite.prepare("SELECT COUNT(*) AS n FROM tx WHERE kind = 'referral'").get().n, 0);
});

test('tin rao vặt: người dùng chờ duyệt, danh mục phải hợp lệ, chỉ chủ tin/admin xóa, xóa danh mục thì tin biến mất', async () => {
  const app = await makeApp();
  const listing = { cat: 'market', title: 'Bán sách cũ', price: '50.000đ', loc: 'Q1, TP.HCM', country: 'Việt Nam', region: 'south', addr: '1 Lê Lợi', desc: 'Còn mới 90%', emoji: '🏷️' };
  const mk = (uid, patch = {}, admin) => app.call('POST', '/listings', { uid, admin, body: { ...listing, ...patch } });
  const a = await mk('u1');
  assert.equal(a.json.status, 'pending');
  assert.equal((await mk('u1', { cat: 'khong-co' })).status, 400);
  assert.equal((await mk('u1', { title: 'abc' })).status, 400);
  assert.equal((await mk('u1', { desc: 'x'.repeat(1900) })).status, 400);
  assert.equal((await app.call('GET', '/listings', { uid: 'u2' })).json.listings.length, 0, 'chưa duyệt thì chưa hiện');
  assert.equal((await app.call('GET', '/admin/listings', { uid: 'u2' })).status, 403);
  assert.equal((await app.call('GET', '/admin/listings', { uid: 'boss', admin: true })).json.listings.length, 1);
  assert.equal((await app.call('POST', `/admin/listings/${a.json.id}/approve`, { uid: 'u1' })).status, 403);
  assert.equal((await app.call('POST', `/admin/listings/${a.json.id}/approve`, { uid: 'boss', admin: true })).status, 200);
  assert.equal((await app.call('POST', `/admin/listings/${a.json.id}/approve`, { uid: 'boss', admin: true })).status, 409);
  const feed = (await app.call('GET', '/listings', { uid: 'u1' })).json.listings;
  assert.equal(feed.length, 1);
  assert.equal(feed[0].mine, true);
  assert.equal(feed[0].desc, 'Còn mới 90%');
  assert.equal((await app.call('GET', '/listings', { uid: 'u2' })).json.listings[0].mine, false);
  // danh mục do admin tạo
  await app.call('PUT', '/admin/store', { uid: 'boss', admin: true, body: { customProducts: [], productEdits: {}, hiddenProducts: [], customCats: [{ id: 'cat-1', name: 'Đồ ăn', emoji: '🍜' }] } });
  const c = await mk('boss', { cat: 'cat-1' }, true);
  assert.equal(c.json.status, 'approved', 'admin đăng hiện ngay');
  assert.equal((await app.call('GET', '/listings', { uid: 'u2' })).json.listings.length, 2);
  await app.call('PUT', '/admin/store', { uid: 'boss', admin: true, body: { customProducts: [], productEdits: {}, hiddenProducts: [], customCats: [] } });
  assert.equal((await app.call('GET', '/listings', { uid: 'u2' })).json.listings.length, 1, 'danh mục bị xóa thì tin trong đó ẩn đi');
  assert.equal((await app.call('POST', `/listings/${a.json.id}/delete`, { uid: 'u2' })).status, 404);
  assert.equal((await app.call('POST', `/listings/${a.json.id}/delete`, { uid: 'u1' })).status, 200);
  assert.equal((await app.call('GET', '/listings', { uid: 'u2' })).json.listings.length, 0);
  for (let i = 0; i < 4; i++) await mk('u3');
  assert.equal((await mk('u3')).status, 200);
  assert.equal((await mk('u3')).status, 429, 'tối đa 5 tin mỗi ngày');
});

test('thích và bình luận: chỉ trên bài đã duyệt, mỗi người một lượt thích, giới hạn độ dài và số lượng, chỉ chủ hoặc admin xóa', async () => {
  const app = await makeApp();
  const mk = async (uid, text, admin) => (await app.call('POST', '/posts', { uid, admin, body: { text, tag: 'Chung' } })).json.id;
  const pending = await mk('A', 'Bài chưa duyệt');
  const id = await mk('boss', 'Bài đã duyệt của admin', true);
  const like = (uid, liked, pid = id) => app.call('POST', `/posts/${pid}/like`, { uid, body: { liked } });
  assert.equal((await like('B', true, pending)).status, 404, 'không thích được bài chưa duyệt');
  assert.equal((await like('B', true, 99999)).status, 404);
  assert.equal((await like('B', 'yes')).status, 400);
  assert.equal((await like('B', true)).json.likes, 1);
  assert.equal((await like('B', true)).json.likes, 1, 'thích lặp lại không tăng thêm');
  assert.equal((await like('C', true)).json.likes, 2);
  assert.equal((await like('B', false)).json.likes, 1);
  assert.equal((await like('B', false)).json.likes, 1, 'bỏ thích lặp lại không âm');
  const comment = (uid, text, pid = id) => app.call('POST', `/posts/${pid}/comments`, { uid, body: { text } });
  assert.equal((await comment('B', 'x', pending)).status, 404);
  assert.equal((await comment('B', '   ')).status, 400);
  assert.equal((await comment('B', 'a'.repeat(301))).status, 400);
  const c1 = (await comment('B', 'Hay quá <b>bài</b>')).json.id;
  await comment('C', 'Cảm ơn bạn');
  const feed = (await app.call('GET', '/posts', { uid: 'B' })).json.posts;
  assert.equal(feed.length, 1);
  assert.deepEqual([feed[0].likes, feed[0].liked, feed[0].comments.map((c) => [c.text, c.mine])], [1, false, [['Hay quá <b>bài</b>', true], ['Cảm ơn bạn', false]]]);
  assert.equal((await app.call('GET', '/posts', { uid: 'C' })).json.posts[0].liked, true);
  assert.equal((await app.call('POST', `/comments/${c1}/delete`, { uid: 'C' })).status, 404, 'người khác không xóa được');
  assert.equal((await app.call('POST', `/comments/${c1}/delete`, { uid: 'B' })).status, 200);
  assert.equal((await app.call('POST', `/comments/${c1}/delete`, { uid: 'B' })).status, 404, 'đã xóa thì không xóa lại');
  const c3 = (await comment('C', 'Sẽ bị admin xóa')).json.id;
  assert.equal((await app.call('POST', `/comments/${c3}/delete`, { uid: 'boss', admin: true })).status, 200);
  assert.deepEqual((await app.call('GET', '/posts', { uid: 'B' })).json.posts[0].comments.map((c) => c.text), ['Cảm ơn bạn']);
  for (let i = 0; i < 30; i++) assert.equal((await comment('D', 'bình luận ' + i)).status, 200);
  assert.equal((await comment('D', 'quá nhiều')).status, 429, 'quá 30 bình luận mỗi ngày bị chặn');
  await app.call('POST', `/posts/${id}/delete`, { uid: 'boss', admin: true });
  assert.equal((await comment('B', 'bài đã xóa')).status, 404);
  assert.equal((await app.call('GET', '/posts', { uid: 'B' })).json.posts.length, 0);
});

test('đồng bộ dữ liệu cá nhân: mỗi tài khoản một bản, chỉ giữ khóa cho phép, giới hạn kích thước, không đọc được của người khác', async () => {
  const app = await makeApp();
  assert.deepEqual((await app.call('GET', '/me/state', { uid: 'A' })).json, { rev: 0, at: 0, state: null });
  const put = (uid, state) => app.call('PUT', '/me/state', { uid, body: { state } });
  const r1 = await put('A', { lang: 'en', saved: ['x'], balance: 999999, chips: 5, owned: ['access:en'], premiumUntil: 9e15, posts: [{ text: 'giả' }], settings: { dark: true } });
  assert.equal(r1.status, 200);
  assert.equal(r1.json.rev, 1);
  const got = (await app.call('GET', '/me/state', { uid: 'A' })).json;
  assert.deepEqual(got.state, { lang: 'en', saved: ['x'], settings: { dark: true } }, 'khóa tiền/quyền sở hữu bị bỏ');
  assert.equal((await put('A', { lang: 'ko' })).json.rev, 2, 'rev tăng mỗi lần ghi');
  assert.deepEqual((await app.call('GET', '/me/state', { uid: 'A' })).json.state, { lang: 'ko' }, 'bản mới thay hẳn bản cũ');
  assert.equal((await app.call('GET', '/me/state', { uid: 'B' })).json.state, null, 'người khác không thấy');
  for (const bad of [null, 'x', [1], 5]) assert.equal((await put('A', bad)).status, 400);
  assert.equal((await app.call('PUT', '/me/state', { uid: 'A', body: {} })).status, 400);
  const huge = await put('A', { known: { en: Array.from({ length: 20000 }, (_, i) => 'từ-' + i) } });
  assert.equal(huge.status, 413);
  assert.deepEqual((await app.call('GET', '/me/state', { uid: 'A' })).json.state, { lang: 'ko' }, 'ghi quá lớn không làm mất bản cũ');
  const big = await put('A', { known: { en: Array.from({ length: 5000 }, (_, i) => 'từ-' + i) } });
  assert.equal(big.status, 200, 'dữ liệu học cỡ vài chục KB vẫn qua được giới hạn thân yêu cầu 128KB');
  assert.equal((await app.call('PUT', '/me/state', { uid: 'A', body: { state: {} }, raw: undefined })).status, 200);
});
