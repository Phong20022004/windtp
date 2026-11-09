# Cấu trúc & quy ước

- Build: `node tools/build/build.mjs` -> `dist/WINDTP.html`. Bản build giống từng byte với file gốc trước khi tách (sha256 cca26272…ced3).
- Thứ tự JS chính: `src/js/main.manifest.json`. Thứ tự CSS/script: các `{{include:...}}` trong `src/template.html`.
- Dữ liệu từ vựng: `data/vocab/<lang>.json`, khóa `"Giáo trình|chỉ số quyển"` -> `[[số bài, [[từ, phiên âm, loại từ, nghĩa, ví dụ, dịch ví dụ],...]],...]`.
- Quy ước đặt tên: theo chức năng, không đặt theo phiên bản (v43, v48…) cho file mới.
