# WINDTP

Ứng dụng học ngoại ngữ (Anh, Hàn, Nhật, Pháp, Đức, Trung, Tây Ban Nha). Mã nguồn được tách thành nhiều file nhỏ,
`npm run build` ghép lại thành **một file HTML** `dist/WINDTP.html` (bản build giống từng byte với file gốc trước khi tách).

## Chạy nhanh
```bash
npm install
npm run build        # tạo dist/WINDTP.html (cần cấu hình Firebase, xem mục dưới)
npm run build:test   # tạo dist/WINDTP.test.html với backend xác thực giả, dùng cho kiểm thử
npm run audit        # liệt kê quyển/bài còn trống từ vựng
npm test             # typecheck + unit test + kiểm tra trên trình duyệt headless (cần playwright)
```

## Cấu hình Firebase (đăng nhập)
Đăng nhập dùng Firebase Authentication (email/mật khẩu và Google); quyền admin là custom claim `admin` do máy chủ cấp, không còn
mật khẩu hay email admin trong mã nguồn.
1. Tạo dự án Firebase, bật **Authentication → Sign-in method**: Email/Password và Google.
2. Thêm tên miền chạy app vào **Authentication → Settings → Authorized domains**. Đăng nhập Google và email xác minh cần app
   được phục vụ qua `https://` (ví dụ Firebase Hosting hoặc GitHub Pages), không mở trực tiếp bằng `file://`.
3. Dán cấu hình web của dự án (Project settings → Your apps → SDK setup) vào `firebase.config.json` ở thư mục gốc, hoặc đặt biến
   môi trường `WINDTP_FIREBASE_CONFIG` (CI dùng secret cùng tên). Các trường bắt buộc: `apiKey`, `authDomain`, `projectId`, `appId`.
   Cấu hình web của Firebase không phải bí mật; an toàn nằm ở Authorized domains và quy tắc phía máy chủ.

### Cấp quyền admin
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/đường/dẫn/service-account.json   # tải từ Firebase, KHÔNG commit
npm run admin:grant -- email@gmail.com             # cấp
npm run admin:grant -- email@gmail.com --revoke    # thu hồi
```
Tài khoản phải đã đăng ký trong app và đã xác minh email. Quyền có hiệu lực sau khi đăng nhập lại hoặc tối đa 1 giờ.

Lưu ý phạm vi: hiện mới xác thực danh tính ở máy chủ. Dữ liệu app (đơn hàng, ví Xu, bài đăng...) vẫn lưu trong trình duyệt,
nên các thao tác admin chưa được máy chủ cưỡng chế; phần đó thuộc giai đoạn chuyển dữ liệu lên máy chủ.

## Cấu trúc
```
src/
  template.html            khung HTML; các {{include:...}} được thay bằng nội dung file
  css/  base/ ui/ learning/ shop/ game/     CSS theo chức năng (mỗi file là một khối <style>)
  js/
    main.manifest.json     THỨ TỰ ghép các file JS của app chính (1 scope duy nhất)
    core/                  ngôn ngữ, catalog, trạng thái UI, dữ liệu nhúng
    features/              ôn tập hằng ngày, bài học giáo trình, quiz/thi thử, đăng nhập/admin, xã hội, Premium…
    games/                 game bài lá (Quần hùng hội tụ, bbl-src)
    players/               trình học theo ngôn ngữ (en/ko/zh/fr, es, de, ja) + seoul1a-lesson1
    tools/                 công cụ từ vựng
  scripts/                 các script nhỏ độc lập
  auth/                    dịch vụ xác thực bằng TypeScript (types, service, backend Firebase), esbuild nhúng vào HTML
data/  vocab/  book-lessons/  raw/
tools/ build/  import/  audit/  admin/
tests/ smoke.py, smoke_auth.py (trình duyệt), auth/*.test.ts (unit), fake-auth/ (backend giả cho build test)
docs/STRUCTURE.md
```

## Cần sửa gì thì mở file nào
| Việc | File |
|---|---|
| Thêm/sửa từ vựng, ví dụ | `data/vocab/<lang>.json` |
| Thêm giáo trình/quyển vào thư viện | `src/js/core/catalog-and-identity.js` (`BOOK_CATALOG`) |
| Danh sách bài của từng quyển, mở bài | `src/js/features/learning-book-lessons.js` (`BOOK_LESSONS`, `lesson-open`) |
| Danh sách ngôn ngữ, hội thoại, đề thi (certs) | `src/js/core/languages-and-helpers.js` |
| Ôn tập mỗi ngày (`enrichDaily`, `dailyLesson`) | `src/js/features/daily-review.js` |
| Đề thi thử, luyện tập (`certQuestions`) | `src/js/features/quiz-cert-payment.js` |
| Trình học 9 chế độ từng ngôn ngữ | `src/js/players/*-lessons.js` |
| Khóa Premium | `src/js/features/content-lock-premium.js` |
| Giao diện | `src/css/**` |

Lưu ý: các file trong `src/js/core|features|games` (trừ `players`, `tools`) là **các mảnh nối tiếp của cùng một IIFE**,
không phải module độc lập, nên từng file riêng lẻ có thể không tự chạy được. Thứ tự ghép nằm trong
`src/js/main.manifest.json`: thêm/đổi tên file thì sửa manifest, không cần đánh số tên file. Thứ tự các `{{include}}` CSS
trong `src/template.html` cũng quan trọng (CSS sau ghi đè CSS trước).

## Thêm một ngôn ngữ/giáo trình mới
1. Đặt Excel vào `data/raw/<tên>/`, viết/sao chép script trong `tools/import/` để tạo `data/vocab/<lang>.json`
   (khóa `"Tên giáo trình|chỉ số quyển"` → `[[số bài, [[từ, phiên âm, loại từ, nghĩa, ví dụ, dịch ví dụ], ...]], ...]`).
2. Khai báo quyển trong `BOOK_CATALOG` và danh sách bài trong `BOOK_LESSONS`.
3. Với ngôn ngữ mới cần trình học riêng: sao chép `src/js/players/es-lessons.js`, đổi id (`windtp-xx-host`, `__xxOpen`, `__xxHas`),
   giọng đọc, và thêm `{{include:...}}` + nhánh `lesson-open`.
4. `npm run audit && npm test`.

## Ghi chú GitHub
- Giới hạn 100 MB/file; file lớn nhất hiện khoảng 6 MB. `dist/` không commit, lấy từ artifact của CI hoặc Releases.
- Nếu thêm âm thanh/ảnh lớn, dùng Git LFS và để vào thư mục `assets/`.
