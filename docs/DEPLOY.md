# Triển khai WINDTP lên môi trường thật

Tài liệu này là danh sách việc **bạn phải tự làm** (cần tài khoản Cloudflare và Firebase của bạn). Mã nguồn đã sẵn sàng và có test, nhưng chưa có gì được triển khai từ trong repo này. Giao diện của Cloudflare và Firebase thay đổi theo thời gian, nên tên mục dưới đây chỉ để tìm; hãy đối chiếu với tài liệu chính thức khi thấy khác.

## 1. Thứ tự triển khai
1. **Firebase** (đăng nhập): tạo dự án, bật Authentication với Email/Password và Google, thêm tên miền trang WINDTP vào danh sách *Authorized domains*. Lấy cấu hình web app và lưu vào `firebase.config.json` hoặc biến môi trường `WINDTP_FIREBASE_CONFIG`.
2. **Cloudflare Worker + D1 + R2**: làm theo `worker/README.md` mục "Triển khai". Khác biệt quan trọng:
   - **Cài mới:** `wrangler d1 execute windtp-db --remote --file=schema.sql`.
   - **Cơ sở dữ liệu đang chạy:** `wrangler d1 migrations apply windtp-db --remote` (áp các file trong `worker/migrations/` theo thứ tự). Mỗi thay đổi cấu trúc DB phải có migration mới **và** được phản ánh trong `schema.sql`; có test kiểm tra hai bên cho cùng cấu trúc.
   - Chạy `npm run test:worker` trước khi `wrangler deploy`.
3. **Cấp quyền admin:** `npm run admin:grant -- <email>` (đặt custom claim `admin` trong Firebase; cần file service account qua `GOOGLE_APPLICATION_CREDENTIALS`, không commit file đó). Máy chủ chỉ tin cờ này trong token đã được ký.
4. **Build trang:** đặt `WINDTP_API_URL` (địa chỉ Worker) rồi `npm run build`; đưa thư mục `dist/` (kèm `assets/` và `data/`) lên nơi lưu trang. Sau đó `npm run content:upload` để đưa nội dung trả phí lên R2.
5. Kiểm tra thủ công một vòng: đăng ký, đăng nhập, nạp thử một đơn, duyệt đơn bằng tài khoản admin, đăng bài và báo cáo, tải bản sao dữ liệu, xóa một tài khoản thử.
6. Kiểm tra thêm các tính năng mới (chưa từng chạy trên bản thật): đăng nhập trên máy thứ 2 trong cùng tháng (được) và máy thứ 3 (bị từ chối `device-limit`); đăng nhập máy khác thì máy cũ tự đăng xuất; nhập mã mời trong 1 tháng đầu và sau đó (bị từ chối `code-expired`); duyệt đơn `access:` của người được mời rồi xem người mời có đủ 10.000 Xu và 7.000 chip; đăng tin có số điện thoại/Facebook, mở chat, gửi tin, chặn, báo cáo và xử lý báo cáo bằng admin; ô "Làm mới thiết bị" trong khu Kiểm duyệt.

`ALLOWED_ORIGIN` trong `wrangler.toml` phải đúng địa chỉ trang (không có dấu `/` cuối), nếu không trình duyệt sẽ chặn mọi lời gọi API.

### Nạp tiền tự động qua SePay (tùy chọn)
Máy chủ có sẵn webhook `POST /webhooks/sepay`. Khi tiền VND vào tài khoản có nội dung chuyển khoản chứa mã đơn nạp Xu hoặc đơn Premium (`WIND1xxxx`, `WIND2xxxx`, `WIND3xxxx`) và **số tiền khớp chính xác**, đơn được duyệt tự động (người duyệt ghi là `bank:sepay:<mã giao dịch>`). Đơn mua hàng (số tiền do trình duyệt báo), tiền KRW và mọi trường hợp lệch (sai số tiền, thiếu mã, trùng mã) **không** tự duyệt, chỉ hiện trong khung "Tiền vào chưa tự khớp" ở màn Đơn hàng của admin để bạn đối chiếu và duyệt tay.
1. Đăng ký SePay, liên kết tài khoản Techcombank đang nhận tiền.
2. Tạo khóa bí mật dài ngẫu nhiên (từ 16 ký tự, nên 32+), lưu vào Worker: `wrangler secret put SEPAY_API_KEY`.
3. Trong SePay thêm webhook: URL `https://<địa-chỉ-worker>/webhooks/sepay`, kiểu chứng thực *API Key* (SePay gửi tiêu đề `Authorization: Apikey <khóa>`), chỉ gửi giao dịch tiền vào.
4. Thử bằng một khoản nhỏ: tạo đơn nạp tối thiểu, chuyển đúng số tiền kèm mã, kiểm tra đơn tự chuyển sang đã duyệt và Xu được cộng.
Chưa đặt `SEPAY_API_KEY` thì webhook từ chối mọi yêu cầu (503). Định dạng dữ liệu SePay được viết theo tài liệu công khai của họ tại thời điểm làm; hãy đối chiếu tài liệu hiện hành và thử một giao dịch thật trước khi bật cho khách.

## 2. Giới hạn tần suất theo IP (bắt buộc làm ở Cloudflare)
Máy chủ đã giới hạn theo từng tài khoản (bảng `rate_limits`), nhưng **không giới hạn theo IP**: một kẻ tạo hàng loạt tài khoản vẫn có thể dội yêu cầu. Hãy đặt luật *Rate limiting rules* (Security → WAF) cho tên miền của Worker. Gợi ý khởi điểm, chỉnh theo lưu lượng thật:

| Luật | Điều kiện | Ngưỡng | Hành động |
|---|---|---|---|
| Chung | mọi đường dẫn của API | 120 yêu cầu / phút / IP | Chặn 1 phút |
| Ghi dữ liệu | phương thức POST hoặc PUT | 30 yêu cầu / phút / IP | Chặn 10 phút |
| Nhạy cảm | `/session/claim`, `/orders`, `/me/delete`, `/me/export`, `/referral/redeem` | 10 yêu cầu / 10 phút / IP | Chặn 1 giờ |
| Chat | `/threads` (POST) và `/threads/*/send` | 30 yêu cầu / phút / IP | Chặn 10 phút |

Loại trừ `/webhooks/sepay` khỏi các luật trên (hoặc cho phép dải IP của SePay), kẻo giao dịch thật bị chặn nhầm.

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
- Worker tự dọn dữ liệu hết hạn mỗi ngày (cron trong `wrangler.toml`, tự bật khi `wrangler deploy`): bảng giới hạn tần suất cũ, lịch sử thiết bị quá 3 tháng, báo cáo chat đã xử lý quá 90 ngày.
- Bật *Workers Logs / Observability* cho Worker và xem tỷ lệ lỗi 5xx, 429.
- Tạo *Notifications* trong Cloudflare (tăng lỗi Worker, hết hạn mức D1/Workers).
- Dùng một dịch vụ kiểm tra tình trạng bên ngoài mỗi 5 phút gọi một đường dẫn của API khi chưa đăng nhập `GET /health` (kỳ vọng 200 `{"ok":true}`, có kiểm tra cả D1; nếu timeout hoặc 5xx thì báo) và gửi email khi lỗi.
- Theo dõi hàng đợi: số đơn `pending` quá lâu, số báo cáo nội dung đang mở (màn Kiểm duyệt của admin).
- Đặt cảnh báo chi phí/hạn mức trên Cloudflare và Google Cloud.

## 6. Việc chưa làm được bằng mã (cần quyết định của bạn)
- **Nạp tiền tự động:** chỉ đơn nạp Xu VND qua SePay được tự duyệt (mục 1); đơn mua hàng, Premium và KRW vẫn do admin duyệt tay. Casso hoặc ngân hàng khác chưa có.
- **Bảng giá do máy chủ giữ:** quyền lợi đơn mua hàng tính ở `worker/src/shop.js` từ danh sách dòng hàng (và chỉnh sửa giá của admin trong cấu hình cửa hàng). Sửa giá sản phẩm có sẵn phải sửa cả `shop.js` lẫn `src/js/core/languages-and-helpers.js`; test `tests/shop/pricing-sync.test.ts` báo lệch. Lệnh cộng tay `/admin/grant` bị giới hạn mỗi ngày bởi `ADMIN_DAILY_GRANT_LIMIT`.
- **Kết quả game và tiến độ nhiệm vụ** do trình duyệt báo lên, nên chỉ chặn được ở mức hạn mức/ngày; chip kiếm trong game không đáng tin tuyệt đối.
- **Nhân bản mã thiết bị:** khóa phiên do máy chủ cấp đã làm khó, nhưng không thể chặn hoàn toàn. Giới hạn 2 thiết bị/tháng chỉ chặn ở API Worker, không chặn ở bước đăng nhập Firebase; xóa dữ liệu trình duyệt tạo thiết bị mới (admin làm mới được).
- **Chat:** cập nhật bằng cách hỏi lại mỗi 3 giây khi đang mở, chưa có thông báo đẩy hay thời gian thực. Muốn có cần Durable Objects/WebSocket hoặc dịch vụ push ngoài (Firebase Cloud Messaging); nên quyết định riêng vì tốn thêm chi phí và công sức.
- **Chưa test trên bản thật:** build, kiểm tra kiểu và test trình duyệt chưa chạy được trong môi trường phát triển (không có mạng); làm theo mục 1 bước 6.
- **Số dư cũ trong localStorage** (từ trước khi có máy chủ) đã không còn hiệu lực; cần quyết định có bồi hoàn thủ công cho ai không.
- **Nội dung bảng chữ cái** (ví dụ, cách đọc, Hán Việt của 214 bộ thủ) do AI soạn; nên nhờ người bản ngữ/giáo viên rà soát trước khi bán.
- **Chính sách quyền riêng tư và điều khoản**: xem `docs/privacy-policy.md` (bản nháp, cần luật sư xem).

## Cấu hình Cloudflare hiện tại (theo dữ liệu 12/11/2026)
| Mục | Giá trị |
| --- | --- |
| Worker | `windtp`, https://windtp.windlord20022004.workers.dev, nối GitHub `Phong20022004/windtp` nhánh `main` |
| D1 | `windtp-db`, binding `DB` (chưa xác nhận đã chạy migration) |
| Biến build | `WINDTP_API_URL` = địa chỉ Worker ở trên |
| R2 | chưa tạo, binding `CONTENT` đang tắt trong `worker/wrangler.toml` |

Còn phải điền trong `worker/wrangler.toml`: `database_id` (lấy ở Cloudflare > D1 > windtp-db), `FIREBASE_PROJECT_ID`, `ALLOWED_ORIGIN` (địa chỉ trang web, không có dấu `/` cuối). Nếu Cloudflare build từ gốc kho thì phải đặt **Root directory = `worker`** (Settings > Build) để dùng đúng `wrangler.toml`. Sau khi deploy chạy: `wrangler d1 migrations apply windtp-db --remote`, rồi mở `/health`.

### Thay R2 bằng Workers KV (không cần thẻ quốc tế)
Máy chủ tự dùng KV khi không có R2. Các bước (làm một lần):
1. `cd worker && npx wrangler kv namespace create CONTENT_KV` (hoặc Cloudflare > Storage & Databases > KV > Create). Sao chép **id**.
2. Trong `worker/wrangler.toml` bỏ dấu `#` ở khối `[[kv_namespaces]]` và dán id vào `id = ...`. Deploy lại.
3. Tải nội dung từ vựng đầy đủ lên (mỗi ngôn ngữ một lệnh, ví dụ tiếng Anh): `npx wrangler kv key put --binding CONTENT_KV --remote "vocab/en.json" --path ../data/vocab/en.json`. Làm tương tự cho `de, es, fr, ja, ko, zh`. File lớn nhất 8 MB, dưới giới hạn 25 MB của KV.
4. Ảnh gian hàng do admin tải lên trong app sẽ tự lưu vào KV.
Lưu ý: KV nhất quán sau vài chục giây giữa các vùng, nên ảnh/nội dung mới tải lên có thể chưa hiện ngay.

### Cách nhanh: một lệnh làm hết
Trên máy của bạn (cần Node 20 trở lên), tại thư mục gốc dự án: `git pull` rồi `bash tools/setup-cloudflare.sh`. Script sẽ đăng nhập Cloudflare (bấm Allow trong trình duyệt), tạo bảng D1, tải 7 file từ vựng lên KV và deploy Worker. Chạy xong mở `<địa chỉ Worker>/health`. Chỉ chạy cho D1 mới; nếu bảng đã tồn tại thì dùng riêng `migrations apply`.
