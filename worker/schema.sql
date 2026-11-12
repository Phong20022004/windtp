-- WINDTP máy chủ: lược đồ D1 (SQLite). Số dư KHÔNG BAO GIỜ âm nhờ ràng buộc CHECK.
CREATE TABLE IF NOT EXISTS wallets (
  uid TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  chips INTEGER NOT NULL DEFAULT 0 CHECK (chips >= 0),
  premium_until INTEGER NOT NULL DEFAULT 0,
  birth TEXT,
  email TEXT, -- email đã xác thực trong token, để admin tìm người nhận thưởng
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS wallets_email ON wallets (email);
-- Sổ giao dịch chỉ ghi thêm.
CREATE TABLE IF NOT EXISTS tx (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  kind TEXT NOT NULL,
  delta INTEGER NOT NULL,
  chips_delta INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  ref TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tx_uid ON tx (uid, id DESC);
-- Khóa chống nhận trùng (điểm danh, nhiệm vụ theo ngày, xử lý đơn). Trùng khóa => cả lô bị hủy.
CREATE TABLE IF NOT EXISTS claims (
  uid TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (uid, key)
);
-- Hạn mức đổi chip theo ngày.
CREATE TABLE IF NOT EXISTS chip_daily (
  uid TEXT NOT NULL,
  day TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  cap INTEGER NOT NULL,
  PRIMARY KEY (uid, day),
  CHECK (amount <= cap) -- chặn vượt hạn mức kể cả khi gửi nhiều yêu cầu song song
);
-- Giá do máy chủ quyết định (avatar, khung, tài liệu, khóa học...).
CREATE TABLE IF NOT EXISTS catalog (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0)
);
CREATE TABLE IF NOT EXISTS entitlements (
  uid TEXT NOT NULL,
  item_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (uid, item_id)
);
-- Đơn hàng / nạp tiền: tạo ở pending, chỉ admin (claim đã xác thực) mới duyệt.
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('topup', 'plan', 'shop', 'fbshare', 'ctask')),
  currency TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  xu INTEGER NOT NULL DEFAULT 0,
  plan_id TEXT,
  code TEXT,
  email TEXT,
  name TEXT,
  summary TEXT,
  lines TEXT, -- JSON [{id, qty}] các món trong giỏ; admin dựa vào bảng giá của mình để quyết định quyền lợi
  contact TEXT, -- JSON {address, phone, docEmail}: chỉ để admin giao hàng/gửi tài liệu
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT
);
-- Nhiệm vụ đặc biệt do admin đăng; thưởng lấy từ đây khi duyệt (không tin con số từ trình duyệt).
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  xu INTEGER NOT NULL DEFAULT 0 CHECK (xu >= 0),
  chips INTEGER NOT NULL DEFAULT 0 CHECK (chips >= 0),
  money INTEGER NOT NULL DEFAULT 0 CHECK (money >= 0),
  cur TEXT NOT NULL DEFAULT 'VND'
);
CREATE INDEX IF NOT EXISTS orders_uid ON orders (uid, id DESC);
CREATE INDEX IF NOT EXISTS orders_status ON orders (status, id);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'Chung',
  is_admin INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')),
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT
);
CREATE INDEX IF NOT EXISTS posts_status ON posts (status, id DESC);
