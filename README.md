# WINDTP

Ứng dụng học ngoại ngữ (Anh, Hàn, Nhật, Pháp, Đức, Trung, Tây Ban Nha). Mã nguồn được tách thành nhiều file nhỏ,
`npm run build` ghép lại thành **một file HTML** `dist/WINDTP.html` (bản build giống từng byte với file gốc trước khi tách).

## Chạy nhanh
```bash
npm run build      # tạo dist/WINDTP.html
npm run audit      # liệt kê quyển/bài còn trống từ vựng
npm test           # build + kiểm tra trên trình duyệt headless (cần playwright)
```

## Cấu trúc
```
src/
  template.html            khung HTML; các {{include:...}} được thay bằng nội dung file
  styles/                  CSS, mỗi file một khối <style> (theo id gốc)
  scripts/                 các script nhỏ (hiệu ứng, ui)
  core/main/               app chính: 1 scope JS duy nhất, chia thành các đoạn nối theo thứ tự 00..23
  players/                 trình học theo ngôn ngữ (en/ko/zh/fr, es, de, ja) + seoul1a-lesson1 (Hàn Seoul)
  game/bbl-src.js          game bài lá
  tools/vocabulary-tool.js công cụ từ vựng
data/
  vocab/<mã ngôn ngữ>.json kho từ vựng + ngữ pháp, khóa "Giáo trình|chỉ số quyển"
  book-lessons/            danh sách bài sinh ra từ Excel (tham chiếu)
  raw/                     Excel gốc (không sửa tay)
tools/
  build.mjs                ghép src + data -> dist
  audit.py                 báo cáo giáo trình trống
  import/                  chuyển Excel -> JSON (Tây Ban Nha, Yonsei Đọc–Nghe, phiên âm Hàn)
tests/smoke.py             kiểm tra mở bài + các chế độ học
```

## Cần sửa gì thì mở file nào
| Việc | File |
|---|---|
| Thêm/sửa từ vựng, ví dụ | `data/vocab/<lang>.json` |
| Thêm giáo trình/quyển vào thư viện | `core/main/04-admin-identity-and-book-catalog.js` (`BOOK_CATALOG`) |
| Danh sách bài của từng quyển | `core/main/06-book-lessons-and-lesson-open.js` (`BOOK_LESSONS`, nhánh `lesson-open`) |
| Danh sách ngôn ngữ, hội thoại, đề thi (certs) | `core/main/00-languages-dialogs-helpers.js` |
| Ôn tập mỗi ngày (`enrichDaily`, `dailyLesson`) | `core/main/05-daily-review-enrichdaily.js` |
| Đề thi thử, luyện tập (`certQuestions`, practice) | `core/main/11-quiz-cert-practice-payment.js` |
| Trình học 9 chế độ của từng ngôn ngữ | `players/*-lessons.js` |
| Khóa Premium | `core/main/22-content-lock-premium.js` |
| Giao diện | `styles/*.css` |

Lưu ý: các đoạn trong `core/main/` là **các mảnh nối tiếp của cùng một IIFE**, không phải module độc lập, nên từng file
riêng lẻ có thể không tự chạy được. Đừng đổi thứ tự số đầu tên file.

## Thêm một ngôn ngữ/giáo trình mới
1. Đặt Excel vào `data/raw/<tên>/`, viết/sao chép script trong `tools/import/` để tạo `data/vocab/<lang>.json`
   (khóa `"Tên giáo trình|chỉ số quyển"` → `[[số bài, [[từ, phiên âm, loại từ, nghĩa, ví dụ, dịch ví dụ], ...]], ...]`).
2. Khai báo quyển trong `BOOK_CATALOG` và danh sách bài trong `BOOK_LESSONS`.
3. Với ngôn ngữ mới cần trình học riêng: sao chép `players/es-lessons.js`, đổi id (`windtp-xx-host`, `__xxOpen`, `__xxHas`),
   giọng đọc, và thêm `{{include:...}}` + nhánh `lesson-open`.
4. `npm run audit && npm test`.

## Ghi chú GitHub
- Giới hạn 100 MB/file; file lớn nhất hiện khoảng 6 MB. `dist/` không commit, lấy từ artifact của CI hoặc Releases.
- Nếu thêm âm thanh/ảnh lớn, dùng Git LFS và để vào thư mục `assets/`.
