# Đề thi thật từ PDF

`jlpt_extract.py exam.pdf key.pdf N2 7/2024 out.json` tách câu hỏi (pdftotext) và ghép bảng đáp án (toạ độ chữ trong PDF đáp án).
`jlpt_build.py N2 data/exams/jlpt-n2.json out1.json ...` gộp các đề; chỉ nhận đề có đủ câu và đủ đáp án, bỏ câu đọc hiểu cần hình/bảng.
Build tự băm và xuất `data/exam.<tên>.<hash>.json` vào `dist/`, manifest có khoá `exams`.
Chưa xử lý: phần nghe (cần file âm thanh), đề dạng ảnh quét (cần OCR).

Đề thật là nội dung trả phí: `npm run build` ghi ra `premium-content/exam/*.json` (không vào `dist/`), `npm run content:upload` đưa lên kho nội dung;
Worker chỉ gửi qua `GET /content/exam/:name` khi người dùng còn Premium và có khóa học tiếng Nhật (hoặc là admin). Thêm đề mới: khai báo tên trong `EXAM_CONTENT` (worker/src/economy.js).
