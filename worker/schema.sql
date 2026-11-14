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

-- Lượt thích: mỗi người một lượt cho mỗi bài (khóa chính ghép chặn thích nhiều lần).
CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL,
  uid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, uid)
);

-- Bình luận hiện ngay; chủ bình luận hoặc admin xóa được (xóa mềm để còn dấu vết).
CREATE TABLE IF NOT EXISTS post_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  uid TEXT NOT NULL,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS post_comments_post ON post_comments (post_id, id);

-- Cấu hình cửa hàng do admin đăng: một dòng JSON đã làm sạch (xem worker/src/store.js).
CREATE TABLE IF NOT EXISTS store (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Giới hạn thiết bị: mỗi tháng (giờ Việt Nam) một tài khoản chỉ dùng tối đa MAX_DEVICES_PER_MONTH thiết bị khác nhau để đăng nhập,
-- sang tháng mới được làm mới. Cùng lúc chỉ một thiết bị đang hoạt động (active_sessions): đăng nhập nơi mới thì nơi cũ bị đăng xuất.
-- device_id do app tạo và gửi qua header X-Device-Id.
CREATE TABLE IF NOT EXISTS device_months (
  uid TEXT NOT NULL,
  month TEXT NOT NULL,
  device_id TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  PRIMARY KEY (uid, month, device_id)
);
-- Phiên hoạt động (thay bảng active_sessions của bản thử trước): khóa phiên do máy chủ cấp lúc đăng nhập, chỉ lưu băm; khóa đổi định kỳ (key_hash mới, khóa cũ còn hiệu lực tới prev_until)
-- nên chép nguyên localStorage sang máy khác chỉ dùng chung được trong ít phút.
CREATE TABLE IF NOT EXISTS user_sessions (
  uid TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  since INTEGER NOT NULL,
  key_hash TEXT NOT NULL,
  prev_hash TEXT,
  key_at INTEGER NOT NULL,
  prev_until INTEGER NOT NULL DEFAULT 0
);

-- Mã mời: mỗi tài khoản đúng một mã. Một người chỉ nhập mã của người khác một lần (invitee là khóa chính).
CREATE TABLE IF NOT EXISTS ref_codes (
  uid TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS referrals (
  invitee TEXT PRIMARY KEY,
  inviter TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  rewarded_at INTEGER -- NULL cho tới khi người được mời mua khóa học và đơn được duyệt
);
CREATE INDEX IF NOT EXISTS referrals_inviter ON referrals (inviter);

-- Tin rao vặt (Chợ đồ cũ, Việc làm, Phòng trọ, danh mục admin tạo): người dùng đăng, admin duyệt như bài cộng đồng.
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  seller TEXT NOT NULL,
  cat TEXT NOT NULL,
  title TEXT NOT NULL,
  price TEXT NOT NULL,
  loc TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  addr TEXT NOT NULL DEFAULT '',
  descr TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS listings_status ON listings (status, id DESC);

-- Cách liên hệ người đăng tin (tùy chọn): số điện thoại, Facebook, Zalo. Bảng riêng để không cần sửa bảng listings đã có.
CREATE TABLE IF NOT EXISTS listing_contacts (
  listing_id INTEGER PRIMARY KEY,
  phone TEXT NOT NULL DEFAULT '',
  facebook TEXT NOT NULL DEFAULT '',
  zalo TEXT NOT NULL DEFAULT ''
);
-- Nhắn tin trực tiếp trên web giữa người xem tin (buyer: mua hàng, xin việc, hỏi thuê) và người đăng (owner). Mỗi cặp (tin, người xem) một cuộc trò chuyện.
CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  owner TEXT NOT NULL,
  buyer TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL,
  UNIQUE (listing_id, buyer)
);
CREATE INDEX IF NOT EXISTS threads_owner ON threads (owner, last_at DESC);
CREATE INDEX IF NOT EXISTS threads_buyer ON threads (buyer, last_at DESC);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);
CREATE INDEX IF NOT EXISTS messages_thread ON messages (thread_id, id);
-- An toàn nhắn tin: chặn trong một cuộc trò chuyện (by_uid là người chặn, 'admin' là khóa của quản trị) và báo cáo cuộc trò chuyện.
CREATE TABLE IF NOT EXISTS thread_blocks (
  thread_id INTEGER NOT NULL,
  by_uid TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (thread_id, by_uid)
);
CREATE TABLE IF NOT EXISTS thread_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  uid TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'dismissed')),
  created_at INTEGER NOT NULL,
  UNIQUE (thread_id, uid)
);
CREATE INDEX IF NOT EXISTS thread_reports_status ON thread_reports (status, id);

-- Dữ liệu cá nhân đồng bộ giữa các thiết bị: một dòng cho mỗi tài khoản, bản ghi sau cùng thắng (rev tăng mỗi lần ghi).
CREATE TABLE IF NOT EXISTS profiles (
  uid TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

-- Giới hạn tần suất và báo cáo (đợt củng cố): giới hạn tần suất theo người dùng, báo cáo nội dung, huy hiệu admin trên bình luận.
CREATE TABLE IF NOT EXISTS rate_limits (
  uid TEXT NOT NULL,
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (uid, bucket)
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('post', 'comment', 'listing')),
  target_id INTEGER NOT NULL,
  uid TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'removed', 'dismissed')),
  created_at INTEGER NOT NULL,
  UNIQUE (kind, target_id, uid)
);
CREATE INDEX IF NOT EXISTS reports_status ON reports (status, id);

