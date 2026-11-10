import { createApi } from './api.js';
import { verifyFirebaseToken } from './auth.js';

const api = createApi({ verify: (token, env) => verifyFirebaseToken(token, { projectId: env.FIREBASE_PROJECT_ID }) });
export default { fetch: (request, env) => api(request, env) };
