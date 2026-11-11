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
  for (let i = 0; i < 9; i++) await app.call('POST', '/posts', { uid: 'u1', body: { text: 'a' } });
  assert.equal((await app.call('POST', '/posts', { uid: 'u1', body: { text: 'a' } })).status, 429);
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
  const body = { kind: 'shop', currency: 'VND', amount: 250000, code: 'ABC', summary: '  2 sản phẩm WIND Store  ', contact: { address: 'Hà Nội', phone: '0900', docEmail: 'a@b.vn', evil: '<script>', bank: '123' } };
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
  await app.call('GET', '/me', { token: await app.as('u1', { email: 'An@Gmail.com' }) });
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
