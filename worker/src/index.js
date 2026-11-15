import { createApi } from './api.js';
import { verifyFirebaseToken } from './auth.js';

const api = createApi({ verify: (token, env) => verifyFirebaseToken(token, { projectId: env.FIREBASE_PROJECT_ID }) });
export default {
  fetch: (request, env) => api(request, env),
  // Lịch hằng ngày (xem [triggers] trong wrangler.toml): dọn dữ liệu hết hạn.
  scheduled: (_event, env, ctx) => { ctx.waitUntil(api.cleanup(env.DB)); },
};
