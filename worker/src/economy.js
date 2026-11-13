// Mọi con số kinh tế nằm Ở ĐÂY (máy chủ quyết định, trình duyệt không được gửi giá/thưởng).
// Giá trị lấy từ hằng số trong app; mục đánh dấu (xác nhận) là suy ra từ code, hãy kiểm tra lại.
export const VN_OFFSET_MS = 7 * 3600 * 1000; // ngày tính theo giờ Việt Nam
export const LIFE_TS = 4102444800000;
export const MONTH_MS = 30 * 86400000; // (xác nhận) 1 tháng Premium = 30 ngày

export const TOPUP_RATE = { VND: 1, KRW: 19, JPY: 160 };
export const MINPAY = { VND: 30000, KRW: 2000, JPY: 200 };
export const TOPUP_PRESETS = {
  VND: [3e4, 5e4, 1e5, 2e5, 5e5, 1e6],
  KRW: [2e3, 5e3, 1e4, 2e4, 5e4, 1e5],
  JPY: [200, 500, 1e3, 2e3, 5e3, 1e4],
};
export const MAX_TOPUP_UNITS = { VND: 2e7, KRW: 2e6, JPY: 2e5 };

export const PLANS = {
  '1m': { months: 1, vnd: 100000, chips: 10000 },
  '3m': { months: 3, vnd: 285000, chips: 30000 },
  '6m': { months: 6, vnd: 550000, chips: 60000 },
  '12m': { months: 12, vnd: 1000000, chips: 100000 },
};

// Nhiệm vụ tự nhận mỗi ngày. Máy chủ không kiểm chứng được tiến độ học, nên chỉ cho 1 lần/ngày, thưởng cố định.
export const DAILY_TASKS = {
  't-checkin': { xu: 200, chips: 0 },
  't-lessons': { xu: 200, chips: 0 },
  't-duel': { xu: 200, chips: 0 },
};
// Thưởng khi admin DUYỆT đơn mua hàng (chỉ máy chủ biết đơn có thật), mỗi ngày một lần.
export const SHOP_TASK = { xu: 1e4, chips: 1e4 };
export const BIG_SHOP_TASK = { xu: 4e4, chips: 4e4, thresholdVnd: 5e4 }; // (xác nhận) ngưỡng ưu đãi

export const CHIP_LIM = { minorDaily: 1e5, adultDaily: 5e6 };
export const MIN_CHIP_AGE = 12; // dưới 12 tuổi không đổi chip
export const MAX_POST_LEN = 2000;
export const MAX_SUMMARY_LEN = 200;
export const MAX_ORDER_GRANTS = 10;
export const MAX_ORDER_LINES = 20;
export const MAX_PREMIUM_MONTHS_PER_ORDER = 1200; // 1200 tháng = gói trọn đời
export const MAX_GRANT = 1e8; // mỗi lần admin cộng tối đa
export const MAX_POSTS_PER_DAY = 10;
export const MAX_PENDING_ORDERS = 5;

export const FB_REWARD = 1000; // thưởng chia sẻ Facebook, mỗi người mỗi kỳ nửa tháng một lần
export const FB_LINK_RE = /^https:\/\/(?:www\.|m\.|web\.|mbasic\.)?(?:facebook\.com|fb\.com|fb\.watch|fb\.me)\/[^\s]{3,}$/i;
export const MAX_TASKS = 100;
export const CONTENT_LANGS = ['en', 'zh', 'ja', 'ko', 'de', 'fr', 'es']; // khớp LANG_CODES của app

// Mã mời: người mời nhận thưởng MỘT LẦN cho mỗi người được mời, chỉ khi đơn có quyền học khóa (access:<ngôn ngữ>) của người đó được duyệt.
export const REFERRAL_REWARD = { xu: 10000, chips: 7000 };
// Giới hạn thiết bị cho mỗi tài khoản (admin không bị giới hạn). Thiết bị không dùng quá DEVICE_IDLE_MS thì nhường chỗ.
export const MAX_DEVICES = 2;
export const DEVICE_IDLE_MS = 30 * 86400000;
export const DEVICE_TOUCH_MS = 3600000; // chỉ ghi lại lần dùng cuối tối đa mỗi giờ một lần
