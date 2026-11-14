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
