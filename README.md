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
  css/  base/ ui/ learning/ shop/ game/     CSS theo chức năng (mỗi file là một khối <style>)
  js/
    main.manifest.json     THỨ TỰ ghép các file JS của app chính (1 scope duy nhất)
    core/                  ngôn ngữ, catalog, trạng thái UI, dữ liệu nhúng
    features/              ôn tập hằng ngày, bài học giáo trình, quiz/thi thử, đăng nhập/admin, xã hội, Premium…
    games/                 game bài lá (Quần hùng hội tụ, bbl-src)
    players/               trình học theo ngôn ngữ (en/ko/zh/fr, es, de, ja) + seoul1a-lesson1
    tools/                 công cụ từ vựng
  scripts/                 các script nhỏ độc lập
data/  vocab/  book-lessons/  raw/
tools/ build/  import/  audit/
tests/smoke.py
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
