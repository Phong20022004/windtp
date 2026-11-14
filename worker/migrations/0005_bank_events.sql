-- Giao dịch ngân hàng nhận qua webhook (SePay). bank_id là khóa chống xử lý trùng; result: received | approved | no-code | no-order | ambiguous | amount-mismatch | not-pending | error.
CREATE TABLE IF NOT EXISTS bank_events (
  bank_id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  content TEXT NOT NULL,
  order_id INTEGER,
  result TEXT NOT NULL DEFAULT 'received',
  created_at INTEGER NOT NULL
);
