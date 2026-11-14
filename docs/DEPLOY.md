# Triển khai WINDTP lên môi trường thật

Tài liệu này là danh sách việc **bạn phải tự làm** (cần tài khoản Cloudflare và Firebase của bạn). Mã nguồn đã sẵn sàng và có test, nhưng chưa có gì được triển khai từ trong repo này. Giao diện của Cloudflare và Firebase thay đổi theo thời gian, nên tên mục dưới đây chỉ để tìm; hãy đối chiếu với tài liệu chính thức khi thấy khác.

## 1. Thứ tự triển khai
1. **Firebase** (đăng nhập): tạo dự án, bật Authentication với Email/Password và Google, thêm tên miền trang WINDTP vào danh sách *Authorized domains*. Lấy cấu hình web app và lưu vào `firebase.config.json` hoặc biến môi trường `WINDTP_FIREBASE_CONFIG`.
2. **Cloudflare Worker + D1 + R2**: làm theo `worker/README.md` mục "Triển khai". Khác biệt quan trọng:
   - **Cài mới:** `wrangler d1 execute windtp --remote --file=schema.sql`.
   - **Cơ sở dữ liệu đang chạy:** `wrangler d1 migrations apply windtp --remote` (áp các file trong `worker/migrations/` theo thứ tự). Mỗi thay đổi cấu trúc DB phải có migration mới **và** được phản ánh trong `schema.sql`; có test kiểm tra hai bên cho cùng cấu trúc.
   - Chạy `npm run test:worker` trước khi `wrangler deploy`.
3. **Cấp quyền admin:** `npm run admin:grant -- <email>` (đặt custom claim `admin` trong Firebase; cần file service account qua `GOOGLE_APPLICATION_CREDENTIALS`, không commit file đó). Máy chủ chỉ tin cờ này trong token đã được ký.
4. **Build trang:** đặt `WINDTP_API_URL` (địa chỉ Worker) rồi `npm run build`; đưa thư mục `dist/` (kèm `assets/` và `data/`) lên nơi lưu trang. Sau đó `npm run content:upload` để đưa nội dung trả phí lên R2.
5. Kiểm tra thủ công một vòng: đăng ký, đăng nhập, nạp thử một đơn, duyệt đơn bằng tài khoản admin, đăng bài và báo cáo, tải bản sao dữ liệu, xóa một tài khoản thử.

`ALLOWED_ORIGIN` trong `wrangler.toml` phải đúng địa chỉ trang (không có dấu `/` cuối), nếu không trình duyệt sẽ chặn mọi lời gọi API.

## 2. Giới hạn tần suất theo IP (bắt buộc làm ở Cloudflare)
Máy chủ đã giới hạn theo từng tài khoản (bảng `rate_limits`), nhưng **không giới hạn theo IP**: một kẻ tạo hàng loạt tài khoản vẫn có thể dội yêu cầu. Hãy đặt luật *Rate limiting rules* (Security → WAF) cho tên miền của Worker. Gợi ý khởi điểm, chỉnh theo lưu lượng thật:

| Luật | Điều kiện | Ngưỡng | Hành động |
|---|---|---|---|
| Chung | mọi đường dẫn của API | 120 yêu cầu / phút / IP | Chặn 1 phút |
| Ghi dữ liệu | phương thức POST hoặc PUT | 30 yêu cầu / phút / IP | Chặn 10 phút |
| Nhạy cảm | `/session/claim`, `/orders`, `/me/delete`, `/me/export` | 10 yêu cầu / 10 phút / IP | Chặn 1 giờ |

Số luật và thời gian chặn được phép phụ thuộc gói Cloudflare; nếu gói miễn phí giới hạn, ưu tiên luật "Ghi dữ liệu". Cũng nên bật *Bot Fight Mode* và để chế độ bảo vệ DDoS mặc định của Cloudflare.

Đăng nhập (Firebase) có giới hạn riêng của Google; có thể bật thêm *Firebase App Check* để chặn lời gọi không đến từ app của bạn.

## 3. Bảo vệ tài khoản admin
Tài khoản admin duyệt đơn và cộng Xu, nên là mục tiêu lớn nhất.
- Dùng một tài khoản **riêng** cho admin, mật khẩu dài và duy nhất, lưu trong trình quản lý mật khẩu.
- Bật xác thực hai lớp ở nơi bạn kiểm soát được: nếu admin đăng nhập bằng Google, bật *2-Step Verification* cho tài khoản Google đó; với Email/Password của Firebase, xác thực đa yếu tố cần nâng dự án lên Identity Platform (kiểm tra điều kiện và chi phí hiện hành trước khi bật).
- Bật 2FA cho tài khoản Cloudflare và Firebase/Google Cloud của chủ dự án; chỉ mời thêm người khi thật cần và theo quyền tối thiểu.
- Không chia sẻ token ID hay chạy `set-admin-claim` trên máy lạ.
- Mọi thao tác duyệt đơn đều nằm trong bảng `orders`/`tx` (có `reviewed_by`); thỉnh thoảng đối chiếu với sao kê ngân hàng.

## 4. Sao lưu và khôi phục
- **D1:** xuất bản sao định kỳ bằng `wrangler d1 export windtp --remote --output=backup-AAAA-MM-DD.sql` (ví dụ mỗi tuần) và cất ở nơi khác (không chỉ trong tài khoản Cloudflare). D1 còn có *Time Travel* (khôi phục về thời điểm trước, thời gian lưu tùy gói); xem `wrangler d1 time-travel`.
- **R2:** nội dung trả phí sinh lại được từ `npm run build` rồi `npm run content:upload`, nên chỉ cần giữ mã nguồn. Ảnh người dùng tải lên (nếu có) chỉ có ở R2: bật sao lưu bằng cách sao chép định kỳ.
- **Thử khôi phục:** ít nhất một lần, nạp bản xuất vào DB thử (`wrangler d1 execute <db-thử> --file=...`) để chắc rằng bản sao dùng được.
- Khi người dùng yêu cầu xóa dữ liệu, nhớ rằng bản sao lưu cũ vẫn còn dữ liệu đó; ghi rõ thời hạn lưu bản sao trong chính sách quyền riêng tư và xóa bản sao cũ theo hạn.

## 5. Giám sát
- Bật *Workers Logs / Observability* cho Worker và xem tỷ lệ lỗi 5xx, 429.
- Tạo *Notifications* trong Cloudflare (tăng lỗi Worker, hết hạn mức D1/Workers).
- Dùng một dịch vụ kiểm tra tình trạng bên ngoài mỗi 5 phút gọi một đường dẫn của API khi chưa đăng nhập (ví dụ `GET /store`, kỳ vọng phản hồi 401 dạng JSON; nếu timeout hoặc 5xx thì báo) và gửi email khi lỗi.
- Theo dõi hàng đợi: số đơn `pending` quá lâu, số báo cáo nội dung đang mở (màn Kiểm duyệt của admin).
- Đặt cảnh báo chi phí/hạn mức trên Cloudflare và Google Cloud.

## 6. Việc chưa làm được bằng mã (cần quyết định của bạn)
- **Nạp tiền tự động:** hiện admin duyệt tay từng đơn. Để tự động cần nối webhook ngân hàng (SePay, Casso...) vào Worker; chưa có.
- **Bảng giá do máy chủ giữ:** admin hiện quyết định quyền lợi khi duyệt đơn; máy chủ chỉ đặt trần. Một tài khoản admin bị chiếm vẫn có thể cộng Xu trong trần cho phép.
- **Kết quả game và tiến độ nhiệm vụ** do trình duyệt báo lên, nên chỉ chặn được ở mức hạn mức/ngày; chip kiếm trong game không đáng tin tuyệt đối.
- **Nhân bản mã thiết bị:** khóa phiên do máy chủ cấp đã làm khó, nhưng không thể chặn hoàn toàn.
- **Số dư cũ trong localStorage** (từ trước khi có máy chủ) đã không còn hiệu lực; cần quyết định có bồi hoàn thủ công cho ai không.
- **Nội dung bảng chữ cái** (ví dụ, cách đọc, Hán Việt của 214 bộ thủ) do AI soạn; nên nhờ người bản ngữ/giáo viên rà soát trước khi bán.
- **Chính sách quyền riêng tư và điều khoản**: xem `docs/privacy-policy.md` (bản nháp, cần luật sư xem).
