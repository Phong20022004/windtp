# Danh sách việc cần khắc phục và cải thiện

Cập nhật: 2026-11-15. Trạng thái: ✅ đã xong · 🔧 đang làm · ⬜ chưa làm · 👤 cần bạn tự làm (mã không làm thay được).
Khi xong một mục, đổi ký hiệu và ghi ngày. Việc triển khai xem `docs/DEPLOY.md`; chính sách quyền riêng tư xem `docs/privacy-policy.md`.

## A. Việc bạn phải tự làm (trước khi mở bán thật)
| # | Việc | Trạng thái |
|---|---|---|
| A1 | Triển khai thật Firebase, Cloudflare Worker, D1, R2 theo `docs/DEPLOY.md`, rồi thử một vòng đầy đủ (đăng ký, nạp, duyệt, đăng bài, báo cáo, xuất và xóa dữ liệu) | 👤 |
| A2 | Đặt luật Rate limiting theo IP ở Cloudflare (máy chủ chỉ giới hạn theo tài khoản); loại `/webhooks/sepay` khỏi luật | 👤 |
| A3 | Bảo vệ tài khoản admin: tài khoản riêng, mật khẩu mạnh, 2FA (Google, Cloudflare, Firebase); đối chiếu định kỳ với sao kê ngân hàng | 👤 |
| A4 | Luật sư xem `docs/privacy-policy.md` (điền các chỗ `[...]`), soạn thêm điều khoản sử dụng và quy định hoàn tiền | 👤 |
| A5 | Người bản ngữ hoặc giáo viên rà nội dung bảng chữ cái (ví dụ, cách đọc, 214 bộ thủ, ví dụ Katakana) do AI soạn | 👤 |
| A6 | Cài webhook SePay (`SEPAY_API_KEY`, URL `/webhooks/sepay`) và thử một giao dịch nhỏ; đối chiếu định dạng với tài liệu SePay hiện hành | 👤 |
| A7 | Đặt sao lưu D1 định kỳ và thử khôi phục ít nhất một lần; bật giám sát và cảnh báo (mục 4, 5 trong `docs/DEPLOY.md`) | 👤 |
| A8 | Quyết định bồi hoàn thủ công hay không cho số dư cũ lưu ở localStorage từ trước khi có máy chủ (đã hết hiệu lực) | 👤 |
| A9 | Quyết định cách thu tiền KRW: giữ duyệt tay, hoặc đăng ký merchant Toss Payments (tài khoản ảo + webhook `DEPOSIT_CALLBACK`) | 👤 |
| A10 | Hỏi kế toán/Toss Payments về đăng ký kinh doanh và thuế nếu bán cho người ở Hàn | 👤 |

## B. Việc làm được bằng mã
| # | Việc | Trạng thái |
|---|---|---|
| B1 | Bảng giá do máy chủ giữ: máy chủ tự tính quyền lợi đơn mua hàng và Premium khi duyệt, admin không tự quyết số tiền | ✅ |
| B2 | Trang chính sách/điều khoản hiển thị trong app, có liên kết ở màn đăng ký và Cài đặt (nội dung cần luật sư rà soát, xem A4) | ✅ |
| B3 | Thông báo cho người dùng khi đơn được duyệt hoặc bị từ chối | ✅ |
| B4 | Kiểm tra kiểu nhẹ (`checkJs`/JSDoc hoặc ESLint) cho phần JS, chạy trong `npm test` | 🔧 |
| B5 | Gộp code trùng lặp giữa các player bài học và chế độ Everest | ⬜ |
| B6 | Chuyển `worker/src` sang TypeScript (nhỏ, xử lý tiền và quyền) | ⬜ |
| B7 | Máy chủ tự tính kết quả game/nhiệm vụ thay vì tin trình duyệt (việc lớn; hiện chỉ có hạn mức theo ngày) | ⬜ |
| B8 | Tự duyệt đơn mua hàng/Premium qua webhook (cần B1 trước) | ⬜ |
| B9 | Luồng KRW qua Toss Payments (cần A9 và khóa API của bạn) | ⬜ |
| B10 | Chuyển phần giao diện sang TypeScript | ⬜ Không khuyên làm lúc này |

## C. Đã xong (tham khảo)
- ✅ Củng cố máy chủ: giới hạn tần suất theo tài khoản, kiểm tra kiểu hồ sơ đồng bộ, chống giả tên admin, huy hiệu admin, giới hạn 30 bình luận mỗi bài trong bảng tin, migration có kiểm tra khớp `schema.sql`.
- ✅ Báo cáo nội dung (bài, bình luận, tin đăng) và màn xử lý cho admin.
- ✅ Xuất dữ liệu cá nhân, xóa tài khoản (xác nhận lại mật khẩu, xóa dữ liệu máy chủ trước rồi mới xóa tài khoản đăng nhập).
- ✅ Sửa vòng lặp đồng bộ khi dữ liệu quá lớn; giãn nhịp tải dữ liệu định kỳ; cảnh báo địa chỉ công khai khi đăng tin.
- ✅ `docs/DEPLOY.md`, `docs/privacy-policy.md` (bản nháp), ví dụ Katakana, hỗ trợ đọc màn hình cho bảng chữ cái.
- ✅ Webhook SePay tự duyệt đơn nạp Xu VND khớp mã và số tiền, khung đối soát cho admin.

## D. Hạn chế còn lại (không xóa hẳn được)
- Chống nhân bản thiết bị chỉ giảm nhẹ (khóa phiên do máy chủ cấp, giới hạn 2 thiết bị mỗi tháng).
- Kết quả game và tiến độ nhiệm vụ do trình duyệt báo lên: chỉ chặn bằng hạn mức theo ngày.
- Admin bị chiếm tài khoản: quyền lợi đơn hàng không còn do admin quyết (B1). Còn lại `/admin/grant` cộng tay, nhưng bị giới hạn `ADMIN_DAILY_GRANT_LIMIT` mỗi ngày (mặc định 1.000.000) và có nhật ký.
- Chặn mở F12 chỉ cản người dùng thường; bảo mật thật nằm ở máy chủ.
- Khóa chống lạm dụng (đã nhận thưởng, thiết bị theo tháng) được giữ lại sau khi xóa tài khoản; đã nêu trong chính sách quyền riêng tư.

## E. Quyết định đã chốt
- **TypeScript:** chưa chuyển phần giao diện (chi phí cao, lợi ích thấp lúc này). Giảm lỗi bằng B4. Xem xét lại sau khi chạy thật và thấy lỗi giao diện lặp lại, hoặc khi có thêm người cùng sửa code. B6 làm được sau cùng.
- **Tiền KRW:** tài khoản Toss Bank cá nhân không có API báo tiền vào; chỉ có hướng Toss Payments tài khoản ảo (A9).
