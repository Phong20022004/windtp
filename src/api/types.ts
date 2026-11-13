/** Hợp đồng với máy chủ ví (worker/src/api.js). Mọi con số tiền do máy chủ trả về, trình duyệt không tự tính. */

export interface HistoryEntry {
  id: number;
  kind: string;
  delta: number;
  chips: number;
  title: string;
  at: number;
}

export interface Me {
  uid: string;
  admin: boolean;
  balance: number;
  chips: number;
  premiumUntil: number | null;
  birth: string | null;
  history: HistoryEntry[];
  owned: string[];
  serverTime: number;
}

/** Mã mời của chính mình và tình trạng thưởng (máy chủ tạo mã; thưởng chỉ khi người được mời mua khóa học). */
export interface Referral {
  code: string;
  reward: { xu: number; chips: number };
  invited: number;
  rewarded: number;
  /** Đã nhập mã mời của người khác (chỉ được nhập một lần). */
  referredBy: boolean;
  /** Hạn cuối nhập mã mời của người khác (1 tháng kể từ lúc đăng ký), mili giây. */
  redeemUntil: number;
}

export interface DeviceInfo {
  id: string;
  firstSeen: number;
  /** Đúng thiết bị đang gửi yêu cầu. */
  current: boolean;
  /** Thiết bị đang giữ phiên đăng nhập (cùng lúc chỉ có một). */
  active: boolean;
}

export interface AdminDevices {
  max: number;
  month: string;
  devices: Array<{ id: string; firstSeen: number }>;
  active: { id: string; since: number } | null;
}

export interface DeviceList {
  /** Số thiết bị tối đa mỗi tháng. */
  max: number;
  /** Tháng đang tính (YYYY-MM, giờ Việt Nam); sang tháng mới được làm mới. */
  month: string;
  devices: DeviceInfo[];
}

export type OrderKind = "topup" | "plan" | "shop" | "fbshare" | "ctask";
export type OrderStatus = "pending" | "approved" | "rejected";
export type Currency = "VND" | "KRW" | "JPY";

export interface OrderInput {
  kind: OrderKind;
  currency?: Currency;
  amount?: number;
  planId?: string;
  code?: string;
  /** Mô tả ngắn hiển thị cho admin (tối đa 200 ký tự, máy chủ cắt). */
  summary?: string;
  /** Các món trong giỏ; admin dựa vào bảng giá của mình để quyết định quyền lợi khi duyệt. */
  lines?: Array<{ id: string; qty: number }>;
  /** Thông tin giao hàng/gửi tài liệu, chỉ admin đọc được. */
  contact?: { address?: string; phone?: string; docEmail?: string; bank?: string; bankName?: string; holder?: string };
  /** fbshare: link bài viết Facebook và kỳ nửa tháng (YYYY-MM-a|b). */
  link?: string;
  period?: string;
  /** ctask: mã nhiệm vụ đặc biệt; phần thưởng lấy từ bảng của máy chủ. */
  taskId?: string;
}

export interface SpecialTask {
  id: string;
  title: string;
  xu: number;
  chips: number;
  money: number;
  cur: Currency;
}

export interface Order {
  id: number;
  kind: OrderKind;
  currency: Currency;
  amount: number;
  xu: number;
  planId: string | null;
  code: string | null;
  summary: string | null;
  status: OrderStatus;
  at: number;
}

export interface AdminOrder {
  id: number;
  uid: string;
  kind: OrderKind;
  currency: Currency;
  amount: number;
  xu: number;
  plan_id: string | null;
  code: string | null;
  email: string | null;
  name: string | null;
  summary: string | null;
  /** JSON [{id, qty}] hoặc null. */
  lines: string | null;
  /** JSON {address, phone, docEmail} hoặc null. */
  contact: string | null;
  status: OrderStatus;
  created_at: number;
}

/** Quyền lợi admin kèm khi duyệt đơn mua hàng (sau khi đối chiếu thanh toán); máy chủ giới hạn mức tối đa. */
export interface ApprovalExtras {
  grants?: string[];
  xu?: number;
  chips?: number;
  premiumMonths?: number;
}

export interface PublicComment {
  id: number;
  author: string;
  text: string;
  mine: boolean;
  at: number;
}

export interface PublicPost {
  id: number;
  author: string;
  text: string;
  tag: string;
  admin: boolean;
  mine: boolean;
  at: number;
  likes: number;
  liked: boolean;
  comments: PublicComment[];
}

export interface AdminPost {
  id: number;
  uid: string;
  tag: string;
  author: string;
  text: string;
  status: string;
  created_at: number;
}

export interface CatalogItem {
  id: string;
  kind: string;
  name: string;
  price: number;
}

export type ApiErrorCode =
  | "network"
  | "unauthenticated"
  | "forbidden"
  | "bad-request"
  | "insufficient-or-limit"
  | "duplicate"
  | "not-found"
  | "age-required"
  | "birth-locked"
  | "not-pending"
  | "too-many"
  | "too-large"
  | "premium-required"
  | "course-required"
  | "device-limit"
  | "session-replaced"
  | "bad-code"
  | "no-code"
  | "self-referral"
  | "already-purchased"
  | "code-expired"
  | "unavailable"
  | "bad-response"
  | "unknown";

export const API_MESSAGES: Readonly<Record<ApiErrorCode, string>> = {
  network: "Không kết nối được máy chủ, hãy kiểm tra mạng rồi thử lại",
  unauthenticated: "Phiên đăng nhập đã hết hạn, hãy đăng nhập lại",
  forbidden: "Bạn không có quyền thực hiện thao tác này",
  "bad-request": "Yêu cầu không hợp lệ",
  "insufficient-or-limit": "Không đủ số dư hoặc đã vượt hạn mức",
  duplicate: "Thao tác này đã được thực hiện rồi",
  "not-found": "Không tìm thấy nội dung yêu cầu",
  "age-required": "Bạn cần khai ngày sinh (từ 12 tuổi) để dùng tính năng này",
  "birth-locked": "Ngày sinh chỉ được đặt một lần",
  "not-pending": "Mục này đã được xử lý trước đó",
  "too-many": "Bạn thao tác quá nhiều, hãy thử lại sau",
  "too-large": "Nội dung quá lớn",
  "premium-required": "Bài này cần Premium còn hạn, hãy gia hạn để học tiếp",
  "course-required": "Bạn chưa sở hữu khóa học của ngôn ngữ này",
  "device-limit": "Tháng này tài khoản đã đăng nhập trên 2 thiết bị. Sang tháng sau bạn có thể dùng thiết bị mới, hoặc liên hệ admin để được hỗ trợ",
  "session-replaced": "Tài khoản vừa đăng nhập ở thiết bị khác nên phiên này đã được đăng xuất",
  "bad-code": "Mã mời gồm 8 ký tự chữ và số",
  "no-code": "Không tìm thấy mã mời này",
  "self-referral": "Bạn không thể dùng mã mời của chính mình",
  "already-purchased": "Bạn đã mua khóa học nên không thể nhập mã mời nữa",
  "code-expired": "Đã quá 1 tháng kể từ lúc đăng ký nên không thể nhập mã mời nữa",
  unavailable: "Máy chủ đang bận, hãy thử lại sau giây lát",
  "bad-response": "Máy chủ trả về dữ liệu không hợp lệ",
  unknown: "Có lỗi xảy ra, vui lòng thử lại",
};

/** Lỗi API đã chuẩn hóa; `message` là tiếng Việt hiển thị thẳng cho người dùng. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Mã lỗi gốc của máy chủ (ví dụ "no-item"), để chẩn đoán. */
  readonly serverCode: string;

  constructor(code: ApiErrorCode, status = 0, serverCode = "") {
    super(API_MESSAGES[code]);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.serverCode = serverCode;
  }
}

/** Sản phẩm admin thêm (đã được máy chủ làm sạch); `img` là khóa ảnh trên máy chủ. */
export interface StoreProduct {
  id: string;
  custom: true;
  name: string;
  desc: string;
  price: { VND: number; KRW: number; JPY: number };
  cat: string;
  sub: string;
  emoji: string;
  img?: string;
  ts: number;
  rewardXu: number;
  rewardChips: number;
}

export interface StoreConfig {
  customProducts: StoreProduct[];
  productEdits: Record<string, Partial<Omit<StoreProduct, "id" | "custom" | "cat" | "sub" | "emoji" | "ts">>>;
  hiddenProducts: string[];
  customCats: { id: string; name: string; emoji: string }[];
  updatedAt: number;
}

export interface Listing {
  id: number;
  seller: string;
  cat: string;
  title: string;
  price: string;
  loc: string;
  country: string;
  region: string;
  addr: string;
  desc: string;
  emoji: string;
  at: number;
  mine: boolean;
}

export type ListingInput = Omit<Listing, "id" | "seller" | "at" | "mine">;
