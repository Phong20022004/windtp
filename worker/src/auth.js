// Xác minh ID token của Firebase (RS256) bằng WebCrypto; không phụ thuộc thư viện nào.
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const b64urlToBytes = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const parseJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

let jwksCache = { keys: null, exp: 0 };

async function loadJwks(fetchFn, now) {
  if (jwksCache.keys && jwksCache.exp > now) return jwksCache.keys;
  const res = await fetchFn(JWKS_URL);
  if (!res.ok) throw new Error('jwks-unavailable');
  const body = await res.json();
  jwksCache = { keys: body.keys, exp: now + 3600 * 1000 };
  return body.keys;
}

/** Trả về {uid, email, name, admin} hoặc ném lỗi nếu token không hợp lệ. */
export async function verifyFirebaseToken(token, { projectId, now = Date.now(), fetchFn = fetch, jwks } = {}) {
  if (!projectId) throw new Error('missing-project');
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('bad-token');
  const header = parseJson(parts[0]);
  const payload = parseJson(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('bad-alg');

  const keys = jwks || (await loadJwks(fetchFn, now));
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('unknown-key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + '.' + parts[1]),
  );
  if (!ok) throw new Error('bad-signature');

  const sec = Math.floor(now / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= sec) throw new Error('expired');
  if (typeof payload.iat !== 'number' || payload.iat > sec + 60) throw new Error('bad-iat');
  if (payload.aud !== projectId) throw new Error('bad-aud');
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) throw new Error('bad-iss');
  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw new Error('bad-sub');

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : '',
    name: typeof payload.name === 'string' ? payload.name.slice(0, 30) : '',
    admin: payload.admin === true,
  };
}
