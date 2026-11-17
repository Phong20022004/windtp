-- Dùng WINDTP AI: scope 'g' = cả app theo ngày UTC (Neurons đã tiêu), 'u:<uid>' = từng người dùng theo ngày giờ Việt Nam (số tin đã hỏi).
CREATE TABLE IF NOT EXISTS ai_usage (
  scope TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  neurons REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, day)
);
