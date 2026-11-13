-- Đợt củng cố: giới hạn tần suất theo người dùng, báo cáo nội dung, huy hiệu admin trên bình luận.
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

ALTER TABLE post_comments ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
