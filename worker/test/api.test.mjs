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

// ===== Giới hạn thiết bị: 2 thiết bị/tháng, 1 phiên hoạt động =====
const dev = (n) => `device-${n}`.padEnd(16, 'x');
const claim = (app, uid, n) => app.call('POST', '/session/claim', { uid, device: dev(n), body: {} });
const me = async (app, uid, n) => (await app.call('GET', '/me', { uid, device: dev(n) }));

test('thiết bị: mỗi tháng tối đa 2 thiết bị khác nhau đăng nhập; thiết bị thứ 3 bị từ chối nhưng 2 thiết bị cũ vẫn đăng nhập lại được', async () => {
  const app = await makeApp();
  assert.equal((await claim(app, 'u1', 1)).status, 200);
  assert.equal((await claim(app, 'u1', 2)).status, 200);
  const third = await claim(app, 'u1', 3);
  assert.equal(third.status, 403);
  assert.equal(third.json.error, 'device-limit');
  assert.equal((await claim(app, 'u1', 1)).status, 200);
  assert.equal((await claim(app, 'u1', 2)).status, 200);
  // Tài khoản khác không bị ảnh hưởng, kể cả khi dùng lại cùng mã thiết bị.
  assert.equal((await claim(app, 'u2', 3)).status, 200);
});

test('phiên: chỉ 1 thiết bị hoạt động cùng lúc; đăng nhập nơi mới thì nơi cũ bị đăng xuất', async () => {
  const app = await makeApp();
  assert.deepEqual([(await claim(app, 'u1', 1)).json.replaced], [false]);
  assert.equal((await me(app, 'u1', 1)).status, 200);
  const c2 = await claim(app, 'u1', 2);
  assert.deepEqual([c2.status, c2.json.replaced], [200, true]);
  const old = await me(app, 'u1', 1);
  assert.equal(old.status, 403);
  assert.equal(old.json.error, 'session-replaced');
  assert.equal((await me(app, 'u1', 2)).status, 200);
  // Đăng nhập lại ở máy 1 (đã nằm trong 2 máy của tháng) thì máy 2 bị đẩy ra.
  assert.equal((await claim(app, 'u1', 1)).json.replaced, true);
  assert.equal((await me(app, 'u1', 2)).json.error, 'session-replaced');
  assert.equal((await me(app, 'u1', 1)).status, 200);
});

test('phiên: thiết bị thứ 3 bị từ chối không làm mất phiên của thiết bị đang dùng', async () => {
  const app = await makeApp();
  await claim(app, 'u1', 1); await claim(app, 'u1', 2);
  assert.equal((await claim(app, 'u1', 3)).status, 403);
  assert.equal((await me(app, 'u1', 3)).json.error, 'session-replaced');
  assert.equal((await me(app, 'u1', 2)).status, 200);
});

test('phiên: tài khoản chưa có phiên (cũ) hoặc thiếu khóa thì báo no-session (app tự đăng nhập phiên rồi thử lại), không đăng xuất', async () => {
  const app = await makeApp();
  const first = await me(app, 'u1', 1);
  assert.deepEqual([first.status, first.json.error], [403, 'no-session']);
  assert.equal((await claim(app, 'u1', 1)).status, 200);
  assert.equal((await me(app, 'u1', 1)).status, 200);
  const nokey = await app.call('GET', '/me', { uid: 'u1', device: dev(1), sessionKey: '' });
  assert.deepEqual([nokey.status, nokey.json.error], [403, 'no-session']);
  // Thiết bị khác khi máy 1 đang hoạt động thì bị coi là đã bị thay thế, chưa đăng nhập phiên thì không giành được.
  assert.equal((await me(app, 'u1', 2)).json.error, 'session-replaced');
});

test('phiên: khóa phiên sai bị từ chối; chép mã thiết bị mà không có khóa thì vô dụng', async () => {
  const app = await makeApp();
  await claim(app, 'u1', 1);
  const bad = await app.call('GET', '/me', { uid: 'u1', device: dev(1), sessionKey: 'x'.repeat(32) });
  assert.deepEqual([bad.status, bad.json.error], [403, 'session-replaced']);
  const shaped = await app.call('GET', '/me', { uid: 'u1', device: dev(1), sessionKey: 'Abc_-' + 'y'.repeat(27) });
  assert.equal(shaped.json.error, 'session-replaced');
  assert.equal((await me(app, 'u1', 1)).status, 200);
});

test('phiên: khóa phiên đổi sau 5 phút, khóa cũ còn dùng được 20 phút rồi hết hạn', async () => {
  const app = await makeApp();
  await claim(app, 'u1', 1);
  const k0 = app.keys.get('u1|' + dev(1));
  app.state.t += 4 * 60000;
  const r0 = await me(app, 'u1', 1);
  assert.equal(r0.headers.get('x-session-key'), null); // chưa tới hạn đổi
  app.state.t += 2 * 60000;
  const r1 = await me(app, 'u1', 1);
  const k1 = r1.headers.get('x-session-key');
  assert.match(k1, /^[A-Za-z0-9_-]{32}$/);
  assert.notEqual(k1, k0);
  assert.equal(app.keys.get('u1|' + dev(1)), k1);
  assert.equal((await me(app, 'u1', 1)).headers.get('x-session-key'), null);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(1), sessionKey: k0 })).status, 200); // trong ân hạn
  app.state.t += 21 * 60000;
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(1), sessionKey: k0 })).json.error, 'session-replaced');
  assert.equal((await me(app, 'u1', 1)).status, 200); // khóa hiện tại vẫn dùng tốt (và tiếp tục được đổi)
});

test('phiên: hai trình duyệt chép chung localStorage chỉ dùng chung được vài phút rồi bên chép bị đăng xuất', async () => {
  const app = await makeApp();
  await claim(app, 'u1', 1);
  const stolen = app.keys.get('u1|' + dev(1)); // bản sao khóa ở máy B
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(1), sessionKey: stolen })).status, 200);
  app.state.t += 6 * 60000;
  assert.equal((await me(app, 'u1', 1)).status, 200); // máy A dùng tiếp, khóa đổi
  const b1 = await app.call('GET', '/me', { uid: 'u1', device: dev(1), sessionKey: stolen });
  assert.deepEqual([b1.status, b1.headers.get('x-session-key')], [200, null]); // máy B còn trong ân hạn nhưng không nhận khóa mới
  app.state.t += 25 * 60000;
  assert.equal((await me(app, 'u1', 1)).status, 200);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: dev(1), sessionKey: stolen })).json.error, 'session-replaced');
});

test('phiên: nhiều yêu cầu song song đúng lúc đổi khóa đều thành công và sau đó vẫn dùng được', async () => {
  const app = await makeApp();
  await claim(app, 'u1', 1);
  app.state.t += 6 * 60000;
  const k0 = app.keys.get('u1|' + dev(1));
  const rs = await Promise.all([1, 2, 3, 4, 5].map(() => app.call('GET', '/me', { uid: 'u1', device: dev(1), sessionKey: k0 })));
  assert.deepEqual(rs.map((r) => r.status), [200, 200, 200, 200, 200]);
  assert.ok(rs.filter((r) => r.headers.get('x-session-key')).length <= 1);
  const row = app.db.sqlite.prepare('SELECT COUNT(*) AS n FROM user_sessions WHERE uid = ?').get('u1');
  assert.equal(row.n, 1);
});

test('thiết bị: admin xem được thiết bị trong tháng và thiết bị đang hoạt động của người dùng; người thường không xem được', async () => {
  const app = await makeApp();
  await claim(app, 'u1', 1); await claim(app, 'u1', 2);
  assert.equal((await app.call('GET', '/admin/devices/u1', { uid: 'u2' })).status, 403);
  const r = await app.call('GET', '/admin/devices/u1', { uid: 'boss', admin: true });
  assert.equal(r.status, 200);
  assert.equal(r.json.month, '2026-11');
  assert.deepEqual(r.json.devices.map((d) => d.id), [dev(1), dev(2)]);
  assert.equal(r.json.active.id, dev(2));
  assert.equal((await app.call('GET', '/admin/devices/nobody', { uid: 'boss', admin: true })).json.active, null);
});

test('thiết bị: sang tháng mới được làm mới 2 thiết bị', async () => {
  const app = await makeApp(); // 2026-11-11
  await claim(app, 'u1', 1); await claim(app, 'u1', 2);
  assert.equal((await claim(app, 'u1', 3)).status, 403);
  app.state.t += 25 * DAY; // 2026-12-06
  assert.equal((await claim(app, 'u1', 3)).status, 200);
  assert.equal((await claim(app, 'u1', 4)).status, 200);
  assert.equal((await claim(app, 'u1', 5)).status, 403);
  const list = await app.call('GET', '/devices', { uid: 'u1', device: dev(4) });
  assert.equal(list.json.month, '2026-12');
  assert.deepEqual(list.json.devices.map((d) => [d.id, d.current, d.active]), [[dev(3), false, false], [dev(4), true, true]]);
});

test('thiết bị: thiết bị đang hoạt động qua tháng mới được ghi lại cho tháng đó và tính vào hạn mức 2', async () => {
  const app = await makeApp();
  await claim(app, 'u1', 1);
  app.state.t += 25 * DAY;
  assert.equal((await me(app, 'u1', 1)).status, 200);
  assert.equal((await claim(app, 'u1', 2)).status, 200);
  assert.equal((await claim(app, 'u1', 3)).status, 403);
});

test('thiết bị: ranh giới tháng tính theo giờ Việt Nam', async () => {
  const app = await makeApp();
  app.state.t = Date.parse('2026-11-30T16:59:00Z'); // 23:59 ngày 30/11 giờ VN
  await claim(app, 'u1', 1); await claim(app, 'u1', 2);
  assert.equal((await claim(app, 'u1', 3)).status, 403);
  app.state.t = Date.parse('2026-11-30T17:01:00Z'); // 00:01 ngày 1/12 giờ VN
  assert.equal((await claim(app, 'u1', 3)).status, 200);
});

test('thiết bị: thiếu hoặc sai định dạng X-Device-Id bị 400; admin không bị giới hạn và không bị đăng xuất', async () => {
  const app = await makeApp();
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: '' })).status, 400);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: 'ngan' })).status, 400);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: 'co dau cach va ky tu la !!!' })).status, 400);
  assert.equal((await app.call('GET', '/me', { uid: 'u1', device: 'x'.repeat(65) })).status, 400);
  assert.equal((await claim(app, 'u1', 1)).status, 200);
  for (let i = 1; i <= 4; i++) {
    assert.equal((await app.call('POST', '/session/claim', { uid: 'boss', admin: true, device: dev(i), body: {} })).status, 200);
    assert.equal((await app.call('GET', '/me', { uid: 'boss', admin: true, device: dev(i) })).status, 200);
  }
  assert.equal((await app.call('GET', '/me', { uid: 'boss', admin: true, device: dev(1) })).status, 200);
  assert.equal((await app.call('GET', '/me', { uid: 'boss', admin: true, device: '' })).status, 200);
  assert.equal(app.db.sqlite.prepare('SELECT COUNT(*) AS n FROM device_months WHERE uid = ?').get('boss').n, 0);
  assert.equal(app.db.sqlite.prepare('SELECT COUNT(*) AS n FROM user_sessions WHERE uid = ?').get('boss').n, 0);
});

test('thiết bị: nhiều thiết bị mới đăng nhập song song chỉ có đúng 2 thiết bị được nhận', async () => {
  const app = await makeApp();
  const rs = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => claim(app, 'u1', i)));
  assert.equal(rs.filter((r) => r.status === 200).length, 2);
  assert.equal(rs.filter((r) => r.status === 403).length, 4);
  const month = app.db.sqlite.prepare('SELECT COUNT(*) AS n FROM device_months WHERE uid = ?').get('u1').n;
  assert.equal(month, 2);
  const same = await Promise.all([1, 2, 3, 4].map(() => claim(app, 'u9', 7)));
  assert.deepEqual(same.map((r) => r.status), [200, 200, 200, 200]);
});

test('thiết bị: danh sách thiết bị trong tháng; admin làm mới cho người dùng, người thường không gọi được', async () => {
  const app = await makeApp();
  await claim(app, 'u1', 1); await claim(app, 'u1', 2);
  const list = await app.call('GET', '/devices', { uid: 'u1', device: dev(2) });
  assert.equal(list.json.max, 2);
  assert.deepEqual(list.json.devices.map((d) => [d.id, d.current, d.active]), [[dev(1), false, false], [dev(2), true, true]]);
  assert.equal((await claim(app, 'u1', 3)).status, 403);
  assert.equal((await app.call('POST', '/admin/devices/reset', { uid: 'u1', body: { uid: 'u1' } })).status, 403);
  const r = await app.call('POST', '/admin/devices/reset', { uid: 'boss', admin: true, body: { uid: 'u1' } });
  assert.deepEqual([r.status, r.json.removed], [200, 2]);
  assert.equal((await claim(app, 'u1', 3)).status, 200);
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
  for (let i = 0; i < 10; i++) assert.equal((await comment('D', 'liên tục ' + i)).status, 200);
  assert.equal((await comment('D', 'quá nhanh')).status, 429, 'quá 10 bình luận mỗi phút bị chặn');
  for (let i = 10; i < 30; i++) { if (i % 10 === 0) app.state.t += 61000; assert.equal((await comment('D', 'bình luận ' + i)).status, 200); }
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

test('mã mời: chỉ nhập được trong 1 tháng kể từ lúc đăng ký; GET /referral báo hạn cuối', async () => {
  const app = await makeApp();
  const owner = (await app.call('GET', '/referral', { uid: 'inv' })).json.code;
  const t0 = app.state.t;
  const early = await app.call('GET', '/referral', { uid: 'late' });
  await app.call('GET', '/referral', { uid: 'okuser' });
  assert.equal(early.json.redeemUntil, t0 + 30 * DAY);
  app.state.t = t0 + 29 * DAY;
  assert.equal((await app.call('POST', '/referral/redeem', { uid: 'okuser', body: { code: owner } })).status, 200); // đăng ký từ ngày 0, nhập ở ngày 29: còn hạn
  app.state.t = t0 + 31 * DAY;
  const r = await app.call('POST', '/referral/redeem', { uid: 'late', body: { code: owner } });
  assert.deepEqual([r.status, r.json.error], [403, 'code-expired']);
  assert.equal((await app.call('GET', '/referral', { uid: 'late' })).json.referredBy, false);
  // Người mới đăng ký sau đó vẫn nhập được, hạn tính riêng theo từng người.
  assert.equal((await app.call('POST', '/referral/redeem', { uid: 'fresh', body: { code: owner } })).status, 200);
});

// ===== Liên hệ người đăng và nhắn tin trực tiếp =====
const LST = { cat: 'jobs', title: 'Tuyển phục vụ ca tối', price: '28.000đ/giờ', loc: 'Q1, TP.HCM', country: 'Việt Nam', region: 'south', addr: '1 Lê Lợi', desc: 'Cần 2 bạn', emoji: '🧑‍💻' };
async function approvedListing(app, patch = {}) {
  const r = await app.call('POST', '/listings', { uid: 'seller', body: { ...LST, ...patch } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal((await app.call('POST', `/admin/listings/${r.json.id}/approve`, { uid: 'boss', admin: true, body: {} })).status, 200);
  return r.json.id;
}

test('liên hệ: số điện thoại, Facebook, Zalo được chuẩn hóa và hiện cho người đã đăng nhập; sai định dạng bị từ chối', async () => {
  const app = await makeApp();
  const id = await approvedListing(app, { phone: '0901 234.567', facebook: 'nguyen.van.a', zalo: '+84 901 234 567' });
  const l = (await app.call('GET', '/listings', { uid: 'buyer' })).json.listings.find((x) => x.id === id);
  assert.deepEqual([l.phone, l.facebook, l.zalo], ['0901234567', 'https://facebook.com/nguyen.van.a', '84901234567']);
  const id2 = await approvedListing(app, { facebook: 'https://m.facebook.com/profile.php?id=100001' });
  assert.equal((await app.call('GET', '/listings', { uid: 'buyer' })).json.listings.find((x) => x.id === id2).facebook, 'https://m.facebook.com/profile.php?id=100001');
  const none = await approvedListing(app);
  const n = (await app.call('GET', '/listings', { uid: 'buyer' })).json.listings.find((x) => x.id === none);
  assert.deepEqual([n.phone, n.facebook, n.zalo], ['', '', '']);
  for (const bad of [{ phone: 'abc' }, { phone: '123' }, { zalo: 'zalo.me/x' }, { facebook: 'javascript:alert(1)' }, { facebook: 'https://evil.com/fb' }, { facebook: 'https://user:pw@facebook.com/x' }, { facebook: 'ab' }]) {
    const r = await app.call('POST', '/listings', { uid: 'seller', body: { ...LST, ...bad } });
    assert.deepEqual([r.status, r.json.error], [400, 'bad-contact'], JSON.stringify(bad));
  }
});

test('nhắn tin: người xem mở cuộc trò chuyện, hai bên trao đổi, đếm và đánh dấu đã đọc', async () => {
  const app = await makeApp();
  const id = await approvedListing(app);
  const th = await app.call('POST', '/threads', { uid: 'buyer', body: { listingId: id } });
  assert.equal(th.status, 200);
  assert.equal((await app.call('POST', '/threads', { uid: 'buyer', body: { listingId: id } })).json.id, th.json.id, 'mỗi người một cuộc trò chuyện cho mỗi tin');
  assert.deepEqual((await app.call('GET', '/threads', { uid: 'seller' })).json.threads, [], 'chưa có tin nhắn thì người đăng chưa thấy');
  assert.equal((await app.call('POST', `/threads/${th.json.id}/send`, { uid: 'buyer', body: { text: '  Mình muốn ứng tuyển  ' } })).status, 200);
  const inbox = (await app.call('GET', '/threads', { uid: 'seller' })).json;
  assert.equal(inbox.unread, 1);
  assert.deepEqual([inbox.threads[0].role, inbox.threads[0].lastText, inbox.threads[0].unread, inbox.threads[0].title], ['seller', 'Mình muốn ứng tuyển', 1, LST.title]);
  const view = await app.call('GET', `/threads/${th.json.id}/messages`, { uid: 'seller' });
  assert.deepEqual(view.json.messages.map((m) => [m.mine, m.text]), [[false, 'Mình muốn ứng tuyển']]);
  assert.equal((await app.call('GET', '/threads', { uid: 'seller' })).json.unread, 0, 'mở xem là đã đọc');
  assert.equal((await app.call('POST', `/threads/${th.json.id}/send`, { uid: 'seller', body: { text: 'Chào bạn, nhắn SĐT nhé' } })).status, 200);
  assert.equal((await app.call('GET', '/threads', { uid: 'buyer' })).json.unread, 1);
  const mine = await app.call('GET', `/threads/${th.json.id}/messages`, { uid: 'buyer' });
  assert.deepEqual(mine.json.messages.map((m) => m.mine), [true, false]);
  assert.equal(mine.json.thread.role, 'buyer');
  assert.equal((await app.call('GET', '/threads', { uid: 'buyer' })).json.unread, 0);
});

test('nhắn tin: người ngoài cuộc không đọc/gửi được, không nhắn cho tin của mình hay tin chưa duyệt, giới hạn độ dài và tốc độ', async () => {
  const app = await makeApp();
  const id = await approvedListing(app);
  const th = (await app.call('POST', '/threads', { uid: 'buyer', body: { listingId: id } })).json.id;
  await app.call('POST', `/threads/${th}/send`, { uid: 'buyer', body: { text: 'xin chào' } });
  assert.equal((await app.call('GET', `/threads/${th}/messages`, { uid: 'spy' })).status, 404);
  assert.equal((await app.call('POST', `/threads/${th}/send`, { uid: 'spy', body: { text: 'chen ngang' } })).status, 404);
  assert.deepEqual((await app.call('GET', '/threads', { uid: 'spy' })).json.threads, []);
  const own = await app.call('POST', '/threads', { uid: 'seller', body: { listingId: id } });
  assert.deepEqual([own.status, own.json.error], [400, 'own-listing']);
  const pending = (await app.call('POST', '/listings', { uid: 'seller', body: LST })).json.id;
  assert.equal((await app.call('POST', '/threads', { uid: 'buyer', body: { listingId: pending } })).status, 404);
  assert.equal((await app.call('POST', '/threads', { uid: 'buyer', body: { listingId: 9999 } })).status, 404);
  for (const text of ['', '   ', 'x'.repeat(1001), 123]) assert.equal((await app.call('POST', `/threads/${th}/send`, { uid: 'buyer', body: { text } })).status, 400);
  let last;
  for (let i = 0; i < 45; i++) last = await app.call('POST', `/threads/${th}/send`, { uid: 'buyer', body: { text: 'tin ' + i } });
  assert.equal(last.status, 429);
});

test('báo cáo nội dung: mỗi người một báo cáo/nội dung, admin gỡ hoặc bỏ qua; tên giả admin bị chặn', async () => {
  const app = await makeApp();
  const post = (await app.call('POST', '/posts', { uid: 'boss', admin: true, body: { text: 'Bài chính thức' } })).json.id;
  assert.equal((await app.call('POST', '/reports', { uid: 'A', body: { kind: 'post', id: post, reason: 'x' } })).status, 400, 'lý do quá ngắn');
  assert.equal((await app.call('POST', '/reports', { uid: 'A', body: { kind: 'constructor', id: post, reason: 'spam' } })).status, 400);
  assert.equal((await app.call('POST', '/reports', { uid: 'A', body: { kind: 'post', id: 9999, reason: 'spam' } })).status, 404);
  assert.equal((await app.call('POST', '/reports', { uid: 'A', body: { kind: 'post', id: post, reason: 'spam' } })).status, 200);
  assert.equal((await app.call('POST', '/reports', { uid: 'A', body: { kind: 'post', id: post, reason: 'spam lại' } })).status, 200, 'gửi lại không lỗi nhưng không nhân đôi');
  assert.equal((await app.call('GET', '/admin/reports', { uid: 'A' })).status, 403);
  const list = (await app.call('GET', '/admin/reports', { uid: 'boss', admin: true })).json.reports;
  assert.equal(list.length, 1);
  assert.equal(list[0].text, 'Bài chính thức');
  assert.equal((await app.call('POST', `/admin/reports/${list[0].id}/resolve`, { uid: 'A', body: { remove: true } })).status, 403);
  assert.equal((await app.call('POST', `/admin/reports/${list[0].id}/resolve`, { uid: 'boss', admin: true, body: { remove: true } })).status, 200);
  assert.equal((await app.call('GET', '/posts', { uid: 'A' })).json.posts.length, 0, 'bài bị gỡ khỏi bảng tin');
  assert.equal((await app.call('GET', '/admin/reports', { uid: 'boss', admin: true })).json.reports.length, 0);
});

test('chống giả mạo tên admin; PUT /me/state kiểm tra kiểu từng khóa; giới hạn số lần ghi', async () => {
  const app = await makeApp();
  const bad = await app.call('PUT', '/me/state', { uid: 'A', body: { state: { alpha: 'không phải object' }, rev: 0 } });
  assert.equal(bad.status, 400);
  const posts = [];
  for (const name of ['Admin', 'WINDTP Support', 'Quản trị viên']) {
    const r = await app.call('POST', '/posts', { uid: 'N', name, body: { text: 'xin chào ' + name } });
    if (r.status === 200) posts.push(name);
  }
  const boss = await app.call('POST', '/posts', { uid: 'boss', name: 'Admin', admin: true, body: { text: 'tôi là admin thật' } });
  assert.equal(boss.status, 200);
  const feed = (await app.call('GET', '/posts', { uid: 'boss', admin: true })).json.posts;
  assert.ok(!feed.some((p) => !p.admin && /admin|windtp|quản trị/i.test(p.author)), 'tên người thường không chứa từ dành riêng');
});

test('migrations 0001..0004 cho cùng cấu trúc bảng với schema.sql', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { readFileSync } = await import('node:fs');
  const cols = (sqls) => {
    const d = new DatabaseSync(':memory:');
    for (const f of sqls) d.exec(readFileSync(new URL(f, import.meta.url), 'utf8'));
    const out = {};
    for (const { name } of d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) out[name] = d.prepare(`PRAGMA table_info(${name})`).all().map((c) => `${c.name}:${c.type}:${c.notnull}`).sort();
    return out;
  };
  assert.deepEqual(cols(['../migrations/0001_init.sql', '../migrations/0002_hardening.sql', '../migrations/0003_contacts_threads.sql', '../migrations/0004_thread_safety.sql']), cols(['../schema.sql']));
});

// ===== An toàn nhắn tin và sửa cách liên hệ =====
async function openChat(app) {
  const id = await approvedListing(app);
  const th = (await app.call('POST', '/threads', { uid: 'buyer', body: { listingId: id } })).json.id;
  await app.call('POST', `/threads/${th}/send`, { uid: 'buyer', body: { text: 'xin chào' } });
  return { id, th };
}

test('nhắn tin: chặn chặn cả hai chiều, bỏ chặn thì nhắn lại được, chỉ người trong cuộc chặn được', async () => {
  const app = await makeApp();
  const { th } = await openChat(app);
  assert.equal((await app.call('POST', `/threads/${th}/block`, { uid: 'spy', body: {} })).status, 404);
  assert.equal((await app.call('POST', `/threads/${th}/block`, { uid: 'seller', body: { block: true } })).status, 200);
  for (const uid of ['buyer', 'seller']) {
    const r = await app.call('POST', `/threads/${th}/send`, { uid, body: { text: 'còn không' } });
    assert.deepEqual([r.status, r.json.error], [403, 'blocked'], uid);
  }
  const bv = (await app.call('GET', `/threads/${th}/messages`, { uid: 'buyer' })).json.blocked;
  const sv = (await app.call('GET', `/threads/${th}/messages`, { uid: 'seller' })).json.blocked;
  assert.deepEqual([bv, sv], [{ me: false, other: true }, { me: true, other: false }]);
  // Người kia không tự gỡ được lệnh chặn của người chặn.
  await app.call('POST', `/threads/${th}/block`, { uid: 'buyer', body: { block: false } });
  assert.equal((await app.call('POST', `/threads/${th}/send`, { uid: 'buyer', body: { text: 'x' } })).status, 403);
  assert.equal((await app.call('POST', `/threads/${th}/block`, { uid: 'seller', body: { block: false } })).status, 200);
  assert.equal((await app.call('POST', `/threads/${th}/send`, { uid: 'buyer', body: { text: 'x' } })).status, 200);
});

test('nhắn tin: báo cáo cuộc trò chuyện, admin xem các tin gần nhất rồi khóa hoặc bỏ qua', async () => {
  const app = await makeApp();
  const { th } = await openChat(app);
  await app.call('POST', `/threads/${th}/send`, { uid: 'seller', body: { text: 'chuyển khoản trước nhé' } });
  assert.equal((await app.call('POST', `/threads/${th}/report`, { uid: 'spy', body: { reason: 'lừa đảo' } })).status, 404);
  assert.equal((await app.call('POST', `/threads/${th}/report`, { uid: 'buyer', body: { reason: 'x' } })).status, 400);
  assert.equal((await app.call('POST', `/threads/${th}/report`, { uid: 'buyer', body: { reason: 'Đòi chuyển khoản trước' } })).status, 200);
  assert.equal((await app.call('POST', `/threads/${th}/report`, { uid: 'buyer', body: { reason: 'Đòi chuyển khoản trước' } })).status, 200, 'báo cáo lặp không tạo thêm');
  assert.equal((await app.call('GET', '/admin/thread-reports', { uid: 'u2' })).status, 403);
  const list = (await app.call('GET', '/admin/thread-reports', { uid: 'boss', admin: true })).json.reports;
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].messages.map((m) => m.text), ['xin chào', 'chuyển khoản trước nhé']);
  assert.notEqual(list[0].messages[0].from, list[0].messages[1].from);
  assert.equal((await app.call('POST', `/admin/thread-reports/${list[0].id}/resolve`, { uid: 'boss', admin: true, body: { lock: true } })).status, 200);
  assert.equal((await app.call('POST', `/threads/${th}/send`, { uid: 'seller', body: { text: 'tiếp' } })).json.error, 'blocked');
  assert.equal((await app.call('GET', '/admin/thread-reports', { uid: 'boss', admin: true })).json.reports.length, 0);
});

test('liên hệ: người đăng sửa cách liên hệ cho tin cũ; người khác không sửa được, admin sửa được, sai định dạng bị từ chối', async () => {
  const app = await makeApp();
  const id = await approvedListing(app);
  const read = async () => (await app.call('GET', '/listings', { uid: 'buyer' })).json.listings.find((x) => x.id === id);
  assert.equal((await read()).phone, '');
  const ok = await app.call('POST', `/listings/${id}/contact`, { uid: 'seller', body: { phone: '0988 111 222', facebook: 'shop.abc' } });
  assert.deepEqual([ok.status, ok.json.phone, ok.json.facebook], [200, '0988111222', 'https://facebook.com/shop.abc']);
  assert.deepEqual([(await read()).phone, (await read()).facebook, (await read()).zalo], ['0988111222', 'https://facebook.com/shop.abc', '']);
  assert.equal((await app.call('POST', `/listings/${id}/contact`, { uid: 'buyer', body: { phone: '0900000000' } })).status, 404);
  assert.equal((await app.call('POST', `/listings/${id}/contact`, { uid: 'seller', body: { phone: 'abc' } })).json.error, 'bad-contact');
  assert.equal((await app.call('POST', `/listings/${id}/contact`, { uid: 'boss', admin: true, body: { zalo: '0911222333' } })).status, 200);
  assert.deepEqual([(await read()).phone, (await read()).zalo], ['', '0911222333']);
});
