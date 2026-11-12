#!/usr/bin/env bash
# Tải bản đầy đủ của nội dung trả phí (do `npm run build` xuất ra premium-content/) lên R2. Chạy lại sau mỗi lần dữ liệu bài học đổi.
set -euo pipefail
cd "$(dirname "$0")/.."
BUCKET="${WINDTP_R2_BUCKET:-windtp-content}"
[ -d premium-content/vocab ] || { echo "Chưa có premium-content/: chạy npm run build trước" >&2; exit 1; }
for f in premium-content/vocab/*.json; do
  npx wrangler r2 object put "$BUCKET/vocab/$(basename "$f")" --file="$f" --content-type=application/json --remote
done
