// Máy chủ API CỤC BỘ chỉ để chạy test trình duyệt: dùng đúng mã của worker/ (createApi) trên SQLite thật.
// Chỉ khác production ở chỗ xác thực: nhận token dạng `test.<base64url(JSON)>` do build test của app sinh ra.
// KHÔNG BAO GIỜ triển khai file này; production dùng worker/src/index.js với chữ ký Firebase.
// Dùng: node tests/api-server.mjs <origin-được-phép>   (in ra "PORT=<cổng>" khi sẵn sàng)
import http from 'node:http';
import { createApi } from '../worker/src/api.js';
import { makeDb } from '../worker/test/helpers.mjs';

const origin = process.argv[2];
if (!origin) throw new Error('thiếu tham số origin');

const verify = async (token) => {
  const [prefix, body] = String(token).split('.');
  if (prefix !== 'test' || !body) throw new Error('bad-token');
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('bad-sub');
  return { uid: claims.sub, email: claims.email || '', name: String(claims.name || '').slice(0, 30), admin: claims.admin === true };
};

const handle = createApi({ verify });
const env = { DB: makeDb(), ALLOWED_ORIGIN: origin };

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
  });
  const response = await handle(request, env);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
});

server.listen(0, '127.0.0.1', () => console.log(`PORT=${server.address().port}`));
