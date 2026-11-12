# Cấu trúc & quy ước

- Build: `npm run build` -> `dist/index.html` + `dist/data/` + `dist/assets/`. Từ vựng (`data/vocab/<ngôn ngữ>.json`) được tách lúc build: `dist/data/` chỉ nhận phần miễn phí (bài 1 của quyển đầu, `tools/build/vocab-split.ts`); bản đầy đủ ghi ra `premium-content/` (không commit, không nằm cạnh trang) và được tải lên R2 bằng `npm run content:upload`, máy chủ chỉ gửi cho người có Premium và khóa học (`worker/`). Bài ngày (tính sẵn lúc build, cùng thuật toán xáo trộn cũ) được xuất thành file có băm nội dung và tải theo nhu cầu qua `window.WindtpData` (`src/data/`); ảnh nhúng lớn ở các file trong danh sách cho phép (`ASSET_FILES` trong `tools/build/build.ts`) được tách ra `assets/`. Chưa tách: `embedded-shop-data.js`, `bbl-src.js`, `seoul1a-lesson1.js` (phần chữ).
- Thứ tự JS chính: `src/js/main.manifest.json`. Thứ tự CSS/script: các `{{include:...}}` trong `src/template.html`.
- Dữ liệu từ vựng: `data/vocab/<lang>.json`, khóa `"Giáo trình|chỉ số quyển"` -> `[[số bài, [[từ, phiên âm, loại từ, nghĩa, ví dụ, dịch ví dụ],...]],...]`.
- Quy ước đặt tên: theo chức năng, không đặt theo phiên bản (v43, v48…) cho file mới.
- Xác thực: `src/auth/` (TypeScript) tạo `window.WindtpAuth`; `src/js/features/login-admin.js` chỉ gọi API này. `state.account` trong
  localStorage chỉ để dựng giao diện tạm, phiên và quyền admin luôn lấy từ Firebase (`WindtpAuth.ready`, `isAdmin()`).
- Build: `tools/build/build.ts` (chạy bằng tsx), có chỉ thị `{{include-bundle:...}}` để esbuild gộp file TypeScript thành một thẻ script.
  `--test-auth` thay backend Firebase bằng `tests/fake-auth` (chỉ dùng cho `dist/test.html`).
- Kiểm tra: `npm run typecheck`, `npm run test:unit`, `npm run test:browser`.

## Content-Security-Policy

`tools/build/csp.ts` sinh CSP và `build.ts` chèn vào `<meta http-equiv="Content-Security-Policy">` ở đầu trang.
- Script inline và handler inline (`onclick="__enGo()"`) được cho phép theo băm SHA-256 tính từ HTML cuối cùng, kể cả script trong game bài (nạp qua `iframe srcdoc`, được lấy bằng cách chạy `bbl-src.js` trong sandbox). Không dùng `'unsafe-inline'` cho script và không có `'unsafe-eval'`.
- Hệ quả: **mọi script/handler inline mới thêm vào sẽ tự được băm khi build**, nhưng nội dung chỉ được sinh lúc chạy (ví dụ ghép chuỗi `<script>` bằng JS) thì bị chặn. Handler mới nên gán bằng `addEventListener`.
- Miền ngoài được cho phép: Firebase/Google (đăng nhập), `cdn.jsdelivr.net` (nét chữ Hán), `translate.google.com` (đọc), `api.mymemory.translated.net` (dịch), `fonts.googleapis.com`. Miền `authDomain` lấy từ cấu hình Firebase. Thêm dịch vụ ngoài thì sửa `buildCsp`.
- `tests/smoke_csp.py` kiểm tra không có vi phạm khi dùng app/game và script lạ bị chặn.
- Hạn chế: `frame-ancestors` không đặt được qua thẻ meta, cần đặt header ở hosting (`Content-Security-Policy: frame-ancestors 'none'`). Luồng đăng nhập Google chưa được thử với Firebase thật nên danh sách miền Google dựa trên tài liệu của Firebase.
