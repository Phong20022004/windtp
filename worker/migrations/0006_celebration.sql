-- Cấu hình sự kiện chào mừng sau đăng nhập (Login Celebration) do admin chỉnh.
CREATE TABLE IF NOT EXISTS celebration (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
