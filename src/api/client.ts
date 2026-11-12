import {
  ApiError,
  type AdminOrder,
  type AdminPost,
  type ApprovalExtras,
  type ApiErrorCode,
  type CatalogItem,
  type SpecialTask,
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
  createPost(text: string): Promise<{ id: number }>;
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
    grant(input: { uid?: string; email?: string; xu?: number; chips?: number; note?: string }): Promise<void>;
  };
}

export function createApiClient({ baseUrl, getToken, fetchImpl }: ApiClientOptions): ApiClient {
  const doFetch: typeof fetch = fetchImpl ?? ((input, init) => fetch(input, init));
  const root = baseUrl.replace(/\/+$/, "");

  async function send(method: Method, path: string, body: unknown, forceRefresh: boolean): Promise<Response> {
    const token = await getToken(forceRefresh);
    if (!token) throw new ApiError("unauthenticated", 401, "no-token");
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    if (body !== undefined) headers["content-type"] = "application/json";
    try {
      return await doFetch(root + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
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
    tasks: async () => (await request<{ tasks: SpecialTask[] }>("GET", "/tasks")).tasks,
    myOrders: async () => (await request<{ orders: Order[] }>("GET", "/orders/mine")).orders,
    createPost: async (text) => ({ id: Number((await post("/posts", { text })).id) }),
    posts: async () => (await request<{ posts: PublicPost[] }>("GET", "/posts")).posts,
    admin: {
      orders: async (status = "pending") => (await request<{ orders: AdminOrder[] }>("GET", `/admin/orders?status=${status}`)).orders,
      approveOrder: (id, extras) => done(post(`/admin/orders/${id}/approve`, extras ?? {})),
      rejectOrder: (id) => done(post(`/admin/orders/${id}/reject`)),
      posts: async () => (await request<{ posts: AdminPost[] }>("GET", "/admin/posts")).posts,
      approvePost: (id) => done(post(`/admin/posts/${id}/approve`)),
      rejectPost: (id) => done(post(`/admin/posts/${id}/reject`)),
      grant: (input) => done(post("/admin/grant", input)),
      putTasks: async (items) => Number((await request<{ count: number }>("PUT", "/admin/tasks", { items })).count),
      putCatalog: async (items) => Number((await request<{ count: number }>("PUT", "/admin/catalog", { items })).count),
    },
  };
}
