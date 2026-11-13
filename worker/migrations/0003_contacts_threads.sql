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
