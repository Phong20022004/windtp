import {
  ApiError,
  type AdminOrder,
  type AdminPost,
  type ApprovalExtras,
  type ApiErrorCode,
  type DeviceList,
  type Referral,
  type CatalogItem,
  type SpecialTask,
  type StoreConfig,
  type Me,
  type Order,
  type OrderInput,
  type PublicPost,
} from "./types";

export interface ApiClientOptions {
  /** Địa chỉ gốc của máy chủ, không có dấu "/" cuối. */
  baseUrl: string;
  /** Lấy ID token; `forceRefresh` bắt buộc làm mới (gọi khi máy chủ trả 401). */
  getToken: (forceRefresh: boolean) => Promise<string | null>;
  /** Mã thiết bị gửi kèm mọi yêu cầu (header X-Device-Id) để máy chủ giới hạn số thiết bị mỗi tài khoản. */
  getDeviceId?: () => string;
  fetchImpl?: typeof fetch;
}

type Method = "GET" | "POST" | "PUT";

const BY_SERVER_CODE: Readonly<Record<string, ApiErrorCode>> = {
  "age-required": "age-required",
  "birth-locked": "birth-locked",
  "not-pending": "not-pending",
  "insufficient-or-limit": "insufficient-or-limit",
  duplicate: "duplicate",
  "too-large": "too-large",
  "premium-required": "premium-required",
  "course-required": "course-required",
  "device-limit": "device-limit",
  "bad-code": "bad-code",
  "no-code": "no-code",
  "self-referral": "self-referral",
  "already-purchased": "already-purchased",
};

function classify(status: number, serverCode: string): ApiErrorCode {
  const byCode = BY_SERVER_CODE[serverCode];
  if (byCode) return byCode;
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 402) return "insufficient-or-limit";
  if (status === 409) return "duplicate";
  if (status === 413) return "too-large";
  if (status === 429) return "too-many";
  if (status >= 500) return "unavailable";
  if (status >= 400) return "bad-request";
  return "unknown";
}

export interface ApiClient {
  me(): Promise<Me>;
  setBirth(birth: string): Promise<void>;
  claim(taskId: string): Promise<{ xu: number; chips: number }>;
  exchangeChips(xu: number): Promise<void>;
  purchase(itemId: string): Promise<{ itemId: string }>;
  createOrder(input: OrderInput): Promise<{ id: number }>;
  myOrders(): Promise<Order[]>;
  tasks(): Promise<SpecialTask[]>;
  /** Cấu hình cửa hàng do admin đăng (sản phẩm, chỉnh sửa, ẩn, danh mục). */
  store(): Promise<StoreConfig>;
  /** Từ vựng đầy đủ của một ngôn ngữ; máy chủ chỉ gửi khi còn Premium và có khóa học đó. */
  vocabContent(lang: string): Promise<unknown>;
  /** Mã mời của mình (máy chủ tạo lần đầu gọi) cùng số người đã mời/đã được thưởng. */
  referral(): Promise<Referral>;
  /** Nhập mã mời của người khác (một lần, trước khi tự mua khóa học). */
  redeemReferral(code: string): Promise<void>;
  /** Các thiết bị đang được tính cho tài khoản (tối đa `max`). */
  devices(): Promise<DeviceList>;
  /** Gỡ một thiết bị khác để nhường chỗ. */
  removeDevice(deviceId: string): Promise<void>;
  createPost(text: string, tag: string): Promise<{ id: number; status: "pending" | "approved" }>;
  deletePost(id: number): Promise<void>;
  posts(): Promise<PublicPost[]>;
  admin: {
    orders(status?: "pending" | "approved" | "rejected"): Promise<AdminOrder[]>;
    approveOrder(id: number, extras?: ApprovalExtras): Promise<void>;
    rejectOrder(id: number): Promise<void>;
    posts(): Promise<AdminPost[]>;
    approvePost(id: number): Promise<void>;
    rejectPost(id: number): Promise<void>;
    putCatalog(items: CatalogItem[]): Promise<number>;
    putTasks(items: SpecialTask[]): Promise<number>;
    putStore(store: Omit<StoreConfig, "updatedAt">): Promise<void>;
    /** Tải ảnh (JPEG/PNG/WebP, tối đa 250KB) lên R2; trả về khóa dạng img/<hash>.jpg. */
    uploadImage(image: Blob): Promise<string>;
    grant(input: { uid?: string; email?: string; xu?: number; chips?: number; note?: string }): Promise<void>;
    /** Mở khóa thiết bị cho một người dùng bị kẹt (xóa toàn bộ thiết bị đã ghi nhận). */
    resetDevices(uid: string): Promise<number>;
  };
}

export function createApiClient({ baseUrl, getToken, getDeviceId, fetchImpl }: ApiClientOptions): ApiClient {
  const doFetch: typeof fetch = fetchImpl ?? ((input, init) => fetch(input, init));
  const root = baseUrl.replace(/\/+$/, "");

  async function send(method: Method, path: string, body: unknown, forceRefresh: boolean): Promise<Response> {
    const token = await getToken(forceRefresh);
    if (!token) throw new ApiError("unauthenticated", 401, "no-token");
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    const deviceId = getDeviceId?.();
    if (deviceId) headers["x-device-id"] = deviceId;
    const binary = body instanceof Blob;
    if (body !== undefined) headers["content-type"] = binary ? "application/octet-stream" : "application/json";
    try {
      return await doFetch(root + path, { method, headers, body: body === undefined ? undefined : binary ? body : JSON.stringify(body), cache: "no-store" });
    } catch {
      throw new ApiError("network");
    }
  }

  async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    let response = await send(method, path, body, false);
    // Token có thể vừa hết hạn: làm mới đúng một lần rồi thử lại.
    if (response.status === 401) response = await send(method, path, body, true);
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError(response.ok ? "bad-response" : classify(response.status, ""), response.status);
    }
    if (!response.ok) {
      const serverCode = typeof (payload as { error?: unknown })?.error === "string" ? (payload as { error: string }).error : "";
      throw new ApiError(classify(response.status, serverCode), response.status, serverCode);
    }
    if (payload === null || typeof payload !== "object") throw new ApiError("bad-response", response.status);
    return payload as T;
  }

  const post = (path: string, body: unknown = {}): Promise<Record<string, unknown>> => request("POST", path, body);
  const done = async (promise: Promise<unknown>): Promise<void> => {
    await promise;
  };

  return {
    me: async () => {
      const me = await request<Me>("GET", "/me");
      if (typeof me.balance !== "number" || typeof me.chips !== "number" || !Array.isArray(me.history) || !Array.isArray(me.owned)) {
        throw new ApiError("bad-response", 200);
      }
      return me;
    },
    setBirth: (birth) => done(post("/profile/birth", { birth })),
    claim: async (taskId) => {
      const r = await post("/claim", { taskId });
      return { xu: Number(r.xu) || 0, chips: Number(r.chips) || 0 };
    },
    exchangeChips: (xu) => done(post("/chips/exchange", { xu })),
    purchase: async (itemId) => ({ itemId: String((await post("/purchase", { itemId })).itemId ?? itemId) }),
    createOrder: async (input) => ({ id: Number((await post("/orders", input)).id) }),
    vocabContent: (lang) => request<unknown>("GET", `/content/vocab/${encodeURIComponent(lang)}`),
    referral: async () => {
      const r = await request<Referral>("GET", "/referral");
      if (typeof r.code !== "string" || !r.reward || typeof r.reward.xu !== "number" || typeof r.reward.chips !== "number") throw new ApiError("bad-response", 200);
      return { code: r.code, reward: { xu: r.reward.xu, chips: r.reward.chips }, invited: Number(r.invited) || 0, rewarded: Number(r.rewarded) || 0, referredBy: r.referredBy === true };
    },
    redeemReferral: (code) => done(post("/referral/redeem", { code })),
    devices: async () => {
      const r = await request<DeviceList>("GET", "/devices");
      if (typeof r.max !== "number" || !Array.isArray(r.devices)) throw new ApiError("bad-response", 200);
      return r;
    },
    removeDevice: (deviceId) => done(post("/devices/remove", { deviceId })),
    store: async () => { const r = await request<StoreConfig>("GET", "/store"); if (!Array.isArray(r.customProducts) || !Array.isArray(r.hiddenProducts) || !Array.isArray(r.customCats)) throw new ApiError("bad-response", 200); return r; },
    tasks: async () => (await request<{ tasks: SpecialTask[] }>("GET", "/tasks")).tasks,
    myOrders: async () => (await request<{ orders: Order[] }>("GET", "/orders/mine")).orders,
    createPost: async (text, tag) => { const r = await post("/posts", { text, tag }); return { id: Number(r.id), status: r.status === "approved" ? "approved" : "pending" }; },
    deletePost: (id) => done(post(`/posts/${id}/delete`)),
    posts: async () => (await request<{ posts: PublicPost[] }>("GET", "/posts")).posts,
    admin: {
      orders: async (status = "pending") => (await request<{ orders: AdminOrder[] }>("GET", `/admin/orders?status=${status}`)).orders,
      approveOrder: (id, extras) => done(post(`/admin/orders/${id}/approve`, extras ?? {})),
      rejectOrder: (id) => done(post(`/admin/orders/${id}/reject`)),
      posts: async () => (await request<{ posts: AdminPost[] }>("GET", "/admin/posts")).posts,
      approvePost: (id) => done(post(`/admin/posts/${id}/approve`)),
      rejectPost: (id) => done(post(`/admin/posts/${id}/reject`)),
      grant: (input) => done(post("/admin/grant", input)),
      resetDevices: async (uid) => Number((await post("/admin/devices/reset", { uid })).removed) || 0,
      putStore: (store) => done(request("PUT", "/admin/store", store)),
      uploadImage: async (image) => String((await request<{ key: string }>("PUT", "/admin/image", image)).key),
      putTasks: async (items) => Number((await request<{ count: number }>("PUT", "/admin/tasks", { items })).count),
      putCatalog: async (items) => Number((await request<{ count: number }>("PUT", "/admin/catalog", { items })).count),
    },
  };
}
