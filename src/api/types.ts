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

export interface PublicPost {
  id: number;
  author: string;
  text: string;
  at: number;
}

export interface AdminPost {
  id: number;
  uid: string;
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
