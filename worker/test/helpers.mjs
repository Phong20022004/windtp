import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { createApi } from '../src/api.js';
import { verifyFirebaseToken } from '../src/auth.js';

export const PROJECT = 'windtp-test';
export const ORIGIN = 'https://app.test';
const schema = fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');

/** Giả lập D1 bằng SQLite thật: batch là một giao dịch, lỗi => ROLLBACK. */
export function makeDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(schema);
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    run: async () => { const r = sqlite.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    _run: () => sqlite.prepare(sql).run(...args),
  });
  return {
    sqlite,
    prepare: (sql) => stmt(sql),
    batch: async (stmts) => {
      sqlite.exec('BEGIN');
      try { for (const s of stmts) s._run(); sqlite.exec('COMMIT'); } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    },
  };
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');
export async function makeIssuer(getNow = () => Date.now()) {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  const sign = async (claims, { key = pair.privateKey, kid = 'k1', alg = 'RS256' } = {}) => {
    const head = b64url(JSON.stringify({ alg, kid, typ: 'JWT' }));
    const sec = Math.floor(getNow() / 1000);
    const body = b64url(JSON.stringify({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, iat: sec - 10, exp: sec + 3600, ...claims }));
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${body}`));
    return `${head}.${body}.${b64url(sig)}`;
  };
  return { jwk, sign, pair };
}

export async function makeApp({ clock } = {}) {
  const state = { t: clock ?? Date.parse('2026-11-11T05:00:00Z') };
  const issuer = await makeIssuer(() => state.t);
  const db = makeDb();
  const verify = (token) => verifyFirebaseToken(token, { projectId: PROJECT, now: state.t, jwks: [issuer.jwk] });
  const handle = createApi({ verify, now: () => state.t });
  const objects = new Map([['vocab/en.json', '{"Sach|0":[[1,[["a"]]],[2,[["b"]]]]}'], ['vocab/ko.json', '{"K|0":[[1,[["c"]]]]}']]);
  const env = { DB: db, ALLOWED_ORIGIN: ORIGIN, CONTENT: { get: async (key) => (objects.has(key) ? { body: objects.get(key) } : null), put: async (key, bytes) => { objects.set(key, bytes); } } };
  const as = (uid, extra = {}) => issuer.sign({ sub: uid, name: uid, ...extra });
  // Mỗi uid mặc định dùng đúng một thiết bị cố định ('dev-<uid>') và tự đăng nhập phiên ở lần gọi đầu; truyền device để thử nhiều thiết bị
  // (khi đó test tự gọi /session/claim). Khóa phiên nhận được (kể cả khóa đổi định kỳ) được giữ lại theo từng (uid, thiết bị) như app thật.
  const keys = new Map(), pending = new Map();
  const call = async (method, path, { uid, token, body, raw, admin, origin = ORIGIN, device, sessionKey } = {}) => {
    const headers = { origin };
    const dev = device === undefined ? (uid ? `dev-${uid}`.padEnd(16, '0') : token ? 'dev-token-default-0001' : null) : device;
    if (dev) headers['x-device-id'] = dev;
    const tk = token ?? (uid ? await as(uid, admin ? { admin: true } : {}) : null);
    if (tk) headers.authorization = `Bearer ${tk}`;
    const slot = (uid || token || '') + '|' + dev;
    const isClaim = path === '/session/claim';
    if (device === undefined && tk && !admin && !isClaim && !keys.has(slot) && sessionKey === undefined) {
      if (!pending.has(slot)) pending.set(slot, call('POST', '/session/claim', { uid, token, body: {} }));
      await pending.get(slot); // yêu cầu song song cùng chờ một lần đăng nhập phiên
    }
    const key = sessionKey !== undefined ? sessionKey : keys.get(slot);
    if (key) headers['x-session-key'] = key;
    const res = await handle(new Request('https://api.test' + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) }), env);
    const rotated = res.headers.get('x-session-key');
    if (rotated && sessionKey === undefined) keys.set(slot, rotated);
    const type = res.headers.get('content-type') || '';
    let out;
    if (!type.includes('json')) out = { status: res.status, bytes: new Uint8Array(await res.arrayBuffer()), headers: res.headers };
    else out = { status: res.status, json: res.status === 204 ? null : await res.json(), headers: res.headers };
    if (isClaim && out.json && out.json.sessionKey && sessionKey === undefined) keys.set(slot, out.json.sessionKey);
    return out;
  };
  const balance = (uid) => db.sqlite.prepare('SELECT balance, chips, premium_until AS p FROM wallets WHERE uid = ?').get(uid);
  return { call, db, issuer, state, balance, as, objects, keys, handle, env };
}
