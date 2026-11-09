# Cấu trúc & quy ước

- Build: `npm run build` -> `dist/WINDTP.html`. Trước phase xác thực, bản build giống từng byte với file gốc trước khi tách (sha256 cca26272…ced3); từ nay khác do thêm bundle xác thực.
- Thứ tự JS chính: `src/js/main.manifest.json`. Thứ tự CSS/script: các `{{include:...}}` trong `src/template.html`.
- Dữ liệu từ vựng: `data/vocab/<lang>.json`, khóa `"Giáo trình|chỉ số quyển"` -> `[[số bài, [[từ, phiên âm, loại từ, nghĩa, ví dụ, dịch ví dụ],...]],...]`.
- Quy ước đặt tên: theo chức năng, không đặt theo phiên bản (v43, v48…) cho file mới.
- Xác thực: `src/auth/` (TypeScript) tạo `window.WindtpAuth`; `src/js/features/login-admin.js` chỉ gọi API này. `state.account` trong
  localStorage chỉ để dựng giao diện tạm, phiên và quyền admin luôn lấy từ Firebase (`WindtpAuth.ready`, `isAdmin()`).
- Build: `tools/build/build.ts` (chạy bằng tsx), có chỉ thị `{{include-bundle:...}}` để esbuild gộp file TypeScript thành một thẻ script.
  `--test-auth` thay backend Firebase bằng `tests/fake-auth` (chỉ dùng cho `dist/WINDTP.test.html`).
- Kiểm tra: `npm run typecheck`, `npm run test:unit`, `npm run test:browser`.
