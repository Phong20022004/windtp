#!/usr/bin/env bash
# Cài đặt Cloudflare một lần cho WINDTP: tạo bảng D1, tải từ vựng lên KV, deploy Worker, kiểm tra /health.
# Chạy trên máy của bạn (cần Node 20+), từ thư mục gốc của dự án:  bash tools/setup-cloudflare.sh
set -euo pipefail
cd "$(dirname "$0")/../worker"

echo "== 1/4 Đăng nhập Cloudflare (mở trình duyệt, bấm Allow) =="
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then npx --yes wrangler@3 whoami >/dev/null 2>&1 || npx --yes wrangler@3 login; fi

echo "== 2/4 Tạo bảng trong D1 windtp-db =="
npx --yes wrangler@3 d1 migrations apply windtp-db --remote

echo "== 3/4 Tải từ vựng đầy đủ lên KV =="
for lang in de en es fr ja ko zh; do
  echo "  - $lang"
  npx --yes wrangler@3 kv key put "vocab/$lang.json" --binding CONTENT_KV --path "../data/vocab/$lang.json"
done

echo "== 4/4 Deploy Worker =="
npx --yes wrangler@3 deploy

echo
echo "Xong. Mở địa chỉ Worker + /health, phải thấy {\"ok\":true}."
