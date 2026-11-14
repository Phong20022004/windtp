import {
  ApiError,
  type AdminOrder,
  type AdminPost,
  type ApprovalExtras,
  type ApiErrorCode,
  type AdminDevices,
  type ChatInbox,
  type ContentReport,
  type ReportKind,
  type ChatView,
  type ListingContact,
  type ThreadReport,
  type DeviceList,
  type Referral,
  type CatalogItem,
  type SpecialTask,
  type Listing,
  type ListingInput,
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
  /** Khóa phiên do máy chủ cấp lúc đăng nhập (header X-Session-Key); máy chủ đổi khóa định kỳ và gửi khóa mới qua phản hồi. */
  session?: { get: () => string; set: (key: string) => void };
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
  "session-replaced": "session-replaced",
  "bad-code": "bad-code",
  "no-code": "no-code",
  "self-referral": "self-referral",
  "already-purchased": "already-purchased",
  "code-expired": "code-expired",
  "bad-contact": "bad-contact",
  "own-listing": "own-listing",
  "bad-message": "bad-message",
  blocked: "blocked",
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
  /** Dữ liệu cá nhân đồng bộ giữa các thiết bị (`state` là null khi chưa có bản nào). */
  profile(): Promise<{ rev: number; state: Record<string, unknown> | null }>;
  saveProfile(state: Record<string, unknown>): Promise<number>;
  /** Bản sao toàn bộ dữ liệu của tài khoản đang lưu ở máy chủ. */
  exportData(): Promise<Record<string, unknown>>;
  /** Xóa dữ liệu của tài khoản ở máy chủ (không hoàn tác). */
  deleteData(): Promise<void>;
  /** Báo cáo nội dung vi phạm cho admin. */
  report(kind: ReportKind, id: number, reason: string): Promise<void>;
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
  /** Gọi ngay sau khi đăng nhập: thiết bị này giữ phiên, thiết bị khác bị đăng xuất. */
  claimSession(): Promise<{ replaced: boolean }>;


  createListing(input: ListingInput): Promise<{ id: number; status: "pending" | "approved" }>;
  deleteListing(id: number): Promise<void>;
  listings(): Promise<Listing[]>;
  /** Mở (hoặc lấy lại) cuộc trò chuyện của mình về một tin đăng. */
  openThread(listingId: number): Promise<number>;
  inbox(): Promise<ChatInbox>;
  thread(id: number): Promise<ChatView>;
  sendMessage(threadId: number, text: string): Promise<void>;
  blockThread(threadId: number, block: boolean): Promise<void>;
  reportThread(threadId: number, reason: string): Promise<void>;
  /** Người đăng sửa cách liên hệ của tin mình; trả về giá trị đã chuẩn hóa. */
  setListingContact(listingId: number, contact: Partial<ListingContact>): Promise<ListingContact>;
  createPost(text: string, tag: string): Promise<{ id: number; status: "pending" | "approved" }>;
  deletePost(id: number): Promise<void>;
  /** Đặt trạng thái thích của mình cho một bài đã duyệt; trả về tổng lượt thích mới. */
  likePost(id: number, liked: boolean): Promise<{ likes: number; liked: boolean }>;
  commentPost(id: number, text: string): Promise<{ id: number }>;
  deleteComment(id: number): Promise<void>;
  posts(): Promise<PublicPost[]>;
  admin: {
    orders(status?: "pending" | "approved" | "rejected"): Promise<AdminOrder[]>;
    approveOrder(id: number, extras?: ApprovalExtras): Promise<void>;
    rejectOrder(id: number): Promise<void>;
    posts(): Promise<AdminPost[]>;
    approvePost(id: number): Promise<void>;
    rejectPost(id: number): Promise<void>;
    reports(): Promise<ContentReport[]>;
    resolveReport(id: number, remove: boolean): Promise<void>;
    putCatalog(items: CatalogItem[]): Promise<number>;
    putTasks(items: SpecialTask[]): Promise<number>;
    listings(): Promise<Listing[]>;
    approveListing(id: number): Promise<void>;
    rejectListing(id: number): Promise<void>;
    putStore(store: Omit<StoreConfig, "updatedAt">): Promise<void>;
    /** Tải ảnh (JPEG/PNG/WebP, tối đa 250KB) lên R2; trả về khóa dạng img/<hash>.jpg. */
    uploadImage(image: Blob): Promise<string>;
    grant(input: { uid?: string; email?: string; xu?: number; chips?: number; note?: string }): Promise<void>;
    /** Mở khóa thiết bị cho một người dùng bị kẹt (xóa toàn bộ thiết bị đã ghi nhận). */
    resetDevices(uid: string): Promise<number>;
    threadReports(): Promise<ThreadReport[]>;
    /** lock=true khóa cuộc trò chuyện; false bỏ qua báo cáo. */
    resolveThreadReport(id: number, lock: boolean): Promise<void>;
    /** Thiết bị đã dùng trong tháng và thiết bị đang hoạt động của một người dùng. */
    devices(uid: string): Promise<AdminDevices>;
  };
}

export function createApiClient({ baseUrl, getToken, getDeviceId, session, fetchImpl }: ApiClientOptions): ApiClient {
  const doFetch: typeof fetch = fetchImpl ?? ((input, init) => fetch(input, init));
  const root = baseUrl.replace(/\/+$/, "");

  async function send(method: Method, path: string, body: unknown, forceRefresh: boolean): Promise<Response> {
    const token = await getToken(forceRefresh);
    if (!token) throw new ApiError("unauthenticated", 401, "no-token");
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    const deviceId = getDeviceId?.();
    if (deviceId) headers["x-device-id"] = deviceId;
    const key = session?.get();
    if (key) headers["x-session-key"] = key;
    const binary = body instanceof Blob;
    if (body !== undefined) headers["content-type"] = binary ? "application/octet-stream" : "application/json";
    try {
      return await doFetch(root + path, { method, headers, body: body === undefined ? undefined : binary ? body : JSON.stringify(body), cache: "no-store" });
    } catch {
      throw new ApiError("network");
    }
  }

  async function request<T>(method: Method, path: string, body?: unknown, retried = false): Promise<T> {
    let response = await send(method, path, body, false);
    // Token có thể vừa hết hạn: làm mới đúng một lần rồi thử lại.
    if (response.status === 401) response = await send(method, path, body, true);
    const rotated = response.headers.get("x-session-key");
    if (rotated && /^[A-Za-z0-9_-]{32}$/.test(rotated)) session?.set(rotated);
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError(response.ok ? "bad-response" : classify(response.status, ""), response.status);
    }
    if (!response.ok) {
      const serverCode = typeof (payload as { error?: unknown })?.error === "string" ? (payload as { error: string }).error : "";
      // Chưa có phiên (tài khoản cũ hoặc vừa nâng cấp app): đăng nhập phiên một lần rồi gửi lại yêu cầu.
      if (serverCode === "no-session" && !retried && path !== "/session/claim") {
        await claimSession();
        return request<T>(method, path, body, true);
      }
      throw new ApiError(classify(response.status, serverCode), response.status, serverCode);
    }
    if (payload === null || typeof payload !== "object") throw new ApiError("bad-response", response.status);
    return payload as T;
  }

  const post = (path: string, body: unknown = {}): Promise<Record<string, unknown>> => request("POST", path, body);
  async function claimSession(): Promise<{ replaced: boolean }> {
    const r = await post("/session/claim", {});
    if (typeof r.sessionKey === "string" && /^[A-Za-z0-9_-]{32}$/.test(r.sessionKey)) session?.set(r.sessionKey);
    return { replaced: r.replaced === true };
  }
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
      return { code: r.code, reward: { xu: r.reward.xu, chips: r.reward.chips }, invited: Number(r.invited) || 0, rewarded: Number(r.rewarded) || 0, referredBy: r.referredBy === true, redeemUntil: Number(r.redeemUntil) || 0 };
    },
    redeemReferral: (code) => done(post("/referral/redeem", { code })),
    devices: async () => {
      const r = await request<DeviceList>("GET", "/devices");
      if (typeof r.max !== "number" || typeof r.month !== "string" || !Array.isArray(r.devices)) throw new ApiError("bad-response", 200);
      return r;
    },
    claimSession,
    store: async () => { const r = await request<StoreConfig>("GET", "/store"); if (!Array.isArray(r.customProducts) || !Array.isArray(r.hiddenProducts) || !Array.isArray(r.customCats)) throw new ApiError("bad-response", 200); return r; },
    tasks: async () => (await request<{ tasks: SpecialTask[] }>("GET", "/tasks")).tasks,
    myOrders: async () => (await request<{ orders: Order[] }>("GET", "/orders/mine")).orders,
    createPost: async (text, tag) => { const r = await post("/posts", { text, tag }); return { id: Number(r.id), status: r.status === "approved" ? "approved" : "pending" }; },
    createListing: async (input) => { const r = await post("/listings", input); return { id: Number(r.id), status: r.status === "approved" ? "approved" : "pending" }; },
    deleteListing: (id) => done(post(`/listings/${id}/delete`)),
    listings: async () => { const r = await request<{ listings: Listing[] }>("GET", "/listings"); if (!Array.isArray(r.listings)) throw new ApiError("bad-response", 200); return r.listings; },
    openThread: async (listingId) => { const r = await post("/threads", { listingId }); const id = Number(r.id); if (!Number.isInteger(id)) throw new ApiError("bad-response", 200); return id; },
    inbox: async () => { const r = await request<ChatInbox>("GET", "/threads"); if (!Array.isArray(r.threads)) throw new ApiError("bad-response", 200); return { threads: r.threads, unread: Number(r.unread) || 0 }; },
    thread: async (id) => { const r = await request<ChatView>("GET", `/threads/${id}/messages`); if (!r.thread || !Array.isArray(r.messages)) throw new ApiError("bad-response", 200); return r; },
    sendMessage: (threadId, text) => done(post(`/threads/${threadId}/send`, { text })),
    blockThread: (threadId, block) => done(post(`/threads/${threadId}/block`, { block })),
    reportThread: (threadId, reason) => done(post(`/threads/${threadId}/report`, { reason })),
    setListingContact: async (listingId, contact) => { const r = await post(`/listings/${listingId}/contact`, contact); return { phone: String(r.phone ?? ""), facebook: String(r.facebook ?? ""), zalo: String(r.zalo ?? "") }; },
    deletePost: (id) => done(post(`/posts/${id}/delete`)),
    profile: async () => {
      const r = await request<{ rev: unknown; state: unknown }>("GET", "/me/state");
      const state = r.state && typeof r.state === "object" && !Array.isArray(r.state) ? (r.state as Record<string, unknown>) : null;
      return { rev: Number(r.rev) || 0, state };
    },
    saveProfile: async (state) => Number((await request<{ rev: unknown }>("PUT", "/me/state", { state })).rev) || 0,
    exportData: async () => request<Record<string, unknown>>("GET", "/me/export"),
    deleteData: () => done(post("/me/delete", { confirm: "DELETE" })),
    report: (kind, id, reason) => done(post("/reports", { kind, id, reason })),
    likePost: async (id, liked) => { const r = await post(`/posts/${id}/like`, { liked }); return { likes: Number(r.likes) || 0, liked: r.liked === true }; },
    commentPost: async (id, text) => ({ id: Number((await post(`/posts/${id}/comments`, { text })).id) }),
    deleteComment: (id) => done(post(`/comments/${id}/delete`)),
    posts: async () => (await request<{ posts: PublicPost[] }>("GET", "/posts")).posts,
    admin: {
      orders: async (status = "pending") => (await request<{ orders: AdminOrder[] }>("GET", `/admin/orders?status=${status}`)).orders,
      approveOrder: (id, extras) => done(post(`/admin/orders/${id}/approve`, extras ?? {})),
      rejectOrder: (id) => done(post(`/admin/orders/${id}/reject`)),
      posts: async () => (await request<{ posts: AdminPost[] }>("GET", "/admin/posts")).posts,
      reports: async () => (await request<{ reports: ContentReport[] }>("GET", "/admin/reports")).reports,
      resolveReport: (id, remove) => done(post(`/admin/reports/${id}/resolve`, { remove })),
      approvePost: (id) => done(post(`/admin/posts/${id}/approve`)),
      rejectPost: (id) => done(post(`/admin/posts/${id}/reject`)),
      grant: (input) => done(post("/admin/grant", input)),
      devices: async (uid) => {
        const r = await request<AdminDevices>("GET", "/admin/devices/" + encodeURIComponent(uid));
        if (typeof r.max !== "number" || !Array.isArray(r.devices)) throw new ApiError("bad-response", 200);
        return r;
      },
      threadReports: async () => { const r = await request<{ reports: ThreadReport[] }>("GET", "/admin/thread-reports"); if (!Array.isArray(r.reports)) throw new ApiError("bad-response", 200); return r.reports; },
      resolveThreadReport: (id, lock) => done(post(`/admin/thread-reports/${id}/resolve`, { lock })),
      resetDevices: async (uid) => Number((await post("/admin/devices/reset", { uid })).removed) || 0,

      listings: async () => (await request<{ listings: Listing[] }>("GET", "/admin/listings")).listings,
      approveListing: (id) => done(post(`/admin/listings/${id}/approve`)),
      rejectListing: (id) => done(post(`/admin/listings/${id}/reject`)),
      putStore: (store) => done(request("PUT", "/admin/store", store)),
      uploadImage: async (image) => String((await request<{ key: string }>("PUT", "/admin/image", image)).key),
      putTasks: async (items) => Number((await request<{ count: number }>("PUT", "/admin/tasks", { items })).count),
      putCatalog: async (items) => Number((await request<{ count: number }>("PUT", "/admin/catalog", { items })).count),
    },
  };
}
