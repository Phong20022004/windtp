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
