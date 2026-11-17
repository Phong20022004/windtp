# Hiệu ứng ngày lễ sau đăng nhập (Login Celebration)

**Triển khai:** chạy `wrangler d1 migrations apply windtp-db --remote` (migration `0006_celebration.sql`), deploy lại Worker, rồi `npm run build` và deploy hosting.

**Cách hoạt động:** sau đăng nhập, trình duyệt gửi ngày địa phương (và quốc gia theo đơn vị tiền) lên `GET /celebration`; máy chủ tính lịch dương/âm và trả các sự kiện đang diễn ra. Quà nhận qua `POST /celebration/claim`, khóa chống nhận trùng nằm ở bảng `claims` (`celeb:<sự kiện>:<kỳ>`), nên đổi thiết bị không nhận lại. Xu do máy chủ cộng, mặc định 0 cho mọi sự kiện (Cá tháng Tư không bao giờ có Xu).

**Lì xì Tết và quà Đám cưới:** chỉ mở được sau khi màn pháo hoa kết thúc (hoặc bấm Bỏ qua) và còn nhận đến hết thời gian lễ qua nút vàng "Nhận quà" trên giao diện.

**Admin** (Cài đặt > Tiện ích > "Sự kiện lễ"): bật/tắt, Xu/chip, thời lượng pháo hoa, âm thanh, chính sách phát lại, quốc gia, ngày Đám cưới thế kỷ (để trống = chưa có ngày), "Bật cho mọi người" để thử (mỗi tài khoản nhận một lần cho mỗi lần bật), "Xem thử" không nhận quà.

**Người dùng** xem thử bằng `?celebrate=tet` (không nhận quà); tắt hiệu ứng/âm thanh và xem bộ sưu tập quà ở Cài đặt > "Hiệu ứng ngày lễ".

**Chưa làm:** thiệp và sticker mới chỉ xem trong bộ sưu tập, chưa gửi được trong chat.
