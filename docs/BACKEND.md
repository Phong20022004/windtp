> **Cập nhật mới nhất:** app đã nối vào máy chủ `worker/` (Xu, chip, Premium, mua hàng, đơn, admin duyệt đều do máy chủ giữ, `src/js/features/economy-api.js`). Phần Firestore dưới đây chỉ còn để tham khảo.

> **Trước đó:** hướng Firestore rules bên dưới đã được thay bằng máy chủ Cloudflare Workers + D1 trong `worker/` (có test, chặn gian lận đúng nghĩa). `firestore.rules` chỉ giữ để tham khảo, đừng triển khai. Xem `worker/README.md`.

# Backend ví / đơn hàng / kiểm duyệt (Firestore + security rules)

Trạng thái: **rules đã viết, CHƯA nối vào app và CHƯA kiểm thử bằng emulator.** App hiện vẫn lưu Xu, Premium, đơn hàng
trong localStorage nên chưa được bảo vệ. Không triển khai rules lên dự án đang chạy trước khi làm các bước dưới.

## Mô hình dữ liệu
- `wallets/{uid}`: `balance`, `chips`, `premiumUntil`, `lastTx`, `lastEarn{kind: timestamp}`.
- `wallets/{uid}/tx/{id}`: sổ giao dịch chỉ ghi thêm (`uid`, `kind`, `delta`, `title`, `createdAt`).
- `orders/{id}`, `posts/{id}`: tạo ở `pending`, chỉ admin đổi `status`.
- `users/{uid}`: hồ sơ (tên, avatar, khung); không chứa số dư hay cờ đặc quyền.

## Giới hạn của cách làm không dùng Cloud Functions
Rules chặn được: sửa số dư tùy ý, tự cấp Premium/admin, tự duyệt đơn/bài, sửa hay xóa sổ giao dịch.
Rules **không** chặn được: người dùng tự tạo giao dịch "hợp lệ" trong trần cho phép (`earnCap`), ví dụ tự nhận
thưởng 150 Xu mỗi 5 giây. Muốn chặn hẳn phải tính thưởng ở máy chủ (cần Cloud Functions, gói Blaze).

## Việc còn lại để dùng được
1. Tạo Firestore trong dự án Firebase (gói Spark), chọn vùng gần Việt Nam.
2. Cài `firebase-tools`, chạy emulator và viết test cho rules (`@firebase/rules-unit-testing`): ví, sổ, đơn, bài.
3. Nối app: nạp ví từ `wallets/{uid}` sau đăng nhập, mọi `earn()/spend()` ghi ví + sổ trong một transaction
   (16 chỗ ghi số dư trong `src/js`, tập trung ở `quiz-cert-payment.js`, `lofi-radio.js`).
4. Chuyển duyệt đơn/bài của admin sang ghi vào `orders`/`posts`; nạp Xu và Premium do admin ghi sau khi duyệt đơn.
5. Triển khai: `firebase deploy --only firestore:rules`.
