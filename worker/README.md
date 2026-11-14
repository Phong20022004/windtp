# WINDTP máy chủ (Cloudflare Workers + D1)

Máy chủ giữ **toàn bộ** Xu, chip, Premium, đơn hàng, kiểm duyệt. Trình duyệt chỉ gửi yêu cầu kèm ID token Firebase;
giá, mức thưởng, hạn mức do máy chủ quyết định (`src/economy.js`). Quyền admin chỉ lấy từ claim `admin` đã được Firebase ký.

## Bảo đảm (đã có test trong `test/api.test.mjs`)
- Số dư không thể âm (ràng buộc CHECK trong DB); mọi thay đổi ví nằm trong một lô nguyên tử cùng dòng sổ giao dịch.
- Không duyệt đơn hai lần, không nhận nhiệm vụ hai lần/ngày, không mua trùng, kể cả khi gửi nhiều yêu cầu song song.
- Hạn mức đổi chip theo tuổi được DB ép; ngày sinh chỉ đặt một lần.
- Token giả, hết hạn, sai `aud`/`iss`, sai thuật toán bị từ chối; origin lạ bị chặn.

## Giới hạn còn lại (cần biết)
- **Thưởng khi chơi game / làm bài**: máy chủ không biết người dùng có học thật hay không. Chỉ có 3 nhiệm vụ tự nhận
  (`t-checkin`, `t-lessons`, `t-duel`), mỗi cái 1 lần/ngày, thưởng cố định. Muốn chặn hẳn phải để máy chủ chấm bài/chạy game.
- Nạp tiền vẫn là chuyển khoản + admin xác nhận thủ công: admin phải đối chiếu tiền thật trước khi bấm duyệt.
- Chưa có giới hạn tần suất theo IP: bật Rate limiting rule trong Cloudflare cho `/orders`, `/posts`, `/claim`.
- Các hằng số đánh dấu "(xác nhận)" trong `economy.js` được suy ra từ code app, hãy kiểm tra lại.
- **Bảng giá do chính admin đăng** (`PUT /admin/catalog` tự chạy khi admin mở app) và **quyền lợi của đơn mua hàng do app admin tính** từ bảng sản phẩm của admin rồi gửi kèm khi duyệt; máy chủ chỉ ép trần, tính nguyên tử, một lần, có nhật ký. Vì vậy tài khoản admin là điểm tin cậy cuối cùng: bảo vệ bằng mật khẩu mạnh và bật xác minh 2 bước.
- **Cửa hàng do admin đăng nằm ở máy chủ** (`PUT /admin/store`, `GET /store`): sản phẩm thêm/sửa/ẩn và danh mục tin rao. Ảnh sản phẩm tải lên R2 qua `PUT /admin/image` (JPEG/PNG/WebP ≤ 250KB, nhận dạng theo nội dung, tên theo hash) và phục vụ công khai ở `GET /img/<hash>`. Danh mục tin rao nay chỉ admin tạo/xóa. Admin dùng máy chủ lần đầu thì dữ liệu cửa hàng cũ trên máy mình được chuyển lên một lần.
- **Bài đăng cộng đồng do máy chủ giữ và kiểm duyệt** (admin đăng hiện ngay, người dùng chờ duyệt, chỉ chủ bài hoặc admin xóa được). **Tin rao vặt (Chợ đồ cũ, Việc làm, Phòng trọ) cũng do máy chủ giữ và kiểm duyệt** (tối đa 5 tin/ngày/người, admin đăng hiện ngay, chủ tin hoặc admin xóa được). **Lượt thích (mỗi người một lượt/bài) và bình luận (hiện ngay, tối đa 30/ngày, chủ hoặc admin xóa) cũng nằm ở máy chủ. **Dữ liệu cá nhân** (tiến độ học, mục đã lưu, nhắc nhở, thông báo, cài đặt, chuỗi ngày, avatar/khung, bạn bè/thách đấu, giỏ hàng) đồng bộ giữa các thiết bị qua `GET/PUT /me/state` (bản ghi sau cùng thắng, tối đa ~120KB, chỉ nhận danh sách khóa cố định; tiền, chip, quyền sở hữu, Premium, bài đăng, ngày sinh không đi theo). Nếu hai thiết bị cùng sửa khi mất mạng, bản sửa sau cùng được đẩy lên sẽ thắng.**
- Email chỉ được ghi vào ví (để admin cộng thưởng theo email) khi Firebase xác nhận `email_verified`.
- **Chip thắng trong game** chỉ lưu ở trình duyệt (không quy ra tiền, không đổi lại Xu). Chip do máy chủ cấp (đổi từ Xu, thưởng, gói Premium) vẫn do máy chủ giữ.
- Thưởng chia sẻ Facebook (1.000 Xu/kỳ nửa tháng, link không dùng lại) và nhiệm vụ đặc biệt (admin đăng bằng `PUT /admin/tasks`) chạy qua đơn `fbshare`/`ctask`: admin xem link/ảnh rồi duyệt, máy chủ tự quyết số thưởng. Tiền thật của nhiệm vụ vẫn do admin chuyển khoản thủ công.
- **Mã mời**: mỗi tài khoản có 1 mã 8 ký tự (`GET /referral`). Người mới nhập mã một lần (`POST /referral/redeem {code}`): không tự mời mình, không nhập sau khi đã mua khóa học, và **chỉ trong 1 tháng (30 ngày) kể từ lúc đăng ký** (tính từ lúc tạo ví), quá hạn báo `code-expired`; `GET /referral` trả `redeemUntil` là hạn cuối. Khi admin duyệt đơn có `access:<lang>` đầu tiên của người được mời, máy chủ cộng cho người mời **10.000 Xu + 7.000 chip** đúng một lần (khóa `ref-reward:<người được mời>`, nguyên tử, có dòng sổ loại `referral`). Hoa hồng giới thiệu kiểu cũ (`WIND-…`) đã bỏ.
- **Giới hạn thiết bị**: (1) mỗi tháng (giờ Việt Nam) một tài khoản chỉ đăng nhập tối đa **2 thiết bị khác nhau**, sang tháng mới được làm mới; (2) cùng lúc chỉ **1 thiết bị hoạt động**: đăng nhập nơi mới thì nơi cũ bị đăng xuất.
  - App gửi `X-Device-Id` (localStorage) và gọi `POST /session/claim` ngay sau khi đăng nhập; máy chủ trả `sessionKey` (chỉ lưu băm SHA-256), app gửi lại ở header `X-Session-Key` trong mọi yêu cầu.
  - **Khóa phiên tự đổi sau mỗi 5 phút hoạt động** (khóa mới gửi về qua header phản hồi `X-Session-Key`), khóa cũ còn dùng được 20 phút (yêu cầu song song, mất phản hồi). Nhờ vậy chép nguyên localStorage (mã thiết bị + khóa) sang máy khác chỉ dùng chung được vài phút rồi bên chép bị đăng xuất; bên chép đăng nhập lại thì bên kia bị đẩy ra, nên không dùng song song lâu được.
  - Thiết bị thứ 3 trong tháng nhận 403 `device-limit` (phiên đang dùng không bị đổi); thiết bị đã bị thay nhận 403 `session-replaced` (app tự đăng xuất, chậm tối đa ~60 giây vì app làm mới ví mỗi phút); chưa có phiên hoặc thiếu khóa (tài khoản cũ, vừa nâng cấp app) nhận `no-session` và app tự đăng nhập phiên rồi thử lại, không đăng xuất.
  - Admin không bị giới hạn. Xem: `GET /admin/devices/:uid`; làm mới cho người dùng: `POST /admin/devices/reset {uid}`.
  - Còn lại: giới hạn nằm ở lớp API của máy chủ này, không chặn được bước đăng nhập Firebase (nội dung chạy hoàn toàn ở trình duyệt như bài miễn phí không bị chặn); xóa dữ liệu trình duyệt tạo mã thiết bị mới (tính là thiết bị mới trong tháng); người dùng có thể xem/sửa localStorage của chính họ nên đây là rào cản chống dùng chung tài khoản, không phải bảo mật tuyệt đối.
- **Liên hệ người đăng tin** (mua hàng, ứng tuyển, hỏi thuê, danh mục khác): tin đăng có thể kèm `phone`, `facebook`, `zalo` (tùy chọn; chuẩn hóa và kiểm tra ở máy chủ, sai thì 400 `bad-contact`; Facebook chỉ nhận tên tài khoản hoặc đường dẫn facebook.com/fb.com/fb.me/m.me). Chỉ người đã đăng nhập thấy các thông tin này. Ngoài ra có nhắn tin trực tiếp trên web: `POST /threads {listingId}` (mở cuộc trò chuyện, mỗi người một cuộc cho mỗi tin; không nhắn cho tin của mình hay tin chưa duyệt), `GET /threads` (hộp thư + số tin chưa đọc), `GET /threads/:id/messages` (chỉ hai người trong cuộc đọc được, mở xem là đánh dấu đã đọc), `POST /threads/:id/send {text}` (1–1000 ký tự, tối đa 40 tin/10 phút). An toàn: `POST /threads/:id/block {block}` (chặn/bỏ chặn trong cuộc trò chuyện, chặn thì cả hai bên không gửi được, lỗi `blocked`), `POST /threads/:id/report {reason}` (người trong cuộc báo cáo; admin chỉ thấy 8 tin gần nhất của đúng cuộc đó qua `GET /admin/thread-reports`, rồi `POST /admin/thread-reports/:id/resolve {lock}` để khóa hoặc bỏ qua). Tin đăng cũ: người đăng bổ sung cách liên hệ bằng `POST /listings/:id/contact {phone, facebook, zalo}` (admin sửa được mọi tin). Bảng mới nằm ở `migrations/0004_thread_safety.sql`.
- **Chống lạm dụng mã mời**: thưởng chỉ phát khi admin duyệt đơn có `access:<lang>` (tiền thật đã vào), nên mỗi lượt thưởng tốn một khóa học thật. Admin cần đối chiếu tiền trước khi duyệt, và nên đặt giá khóa học cao hơn giá trị 10.000 Xu + 7.000 chip.
- **Rate limiting nên bật trong Cloudflare** (Security → WAF → Rate limiting rules), theo IP: `/session/claim` (khoảng 20 lần/10 phút), `/referral/redeem` (khoảng 10 lần/10 phút), `/orders`, `/posts`, `/listings`, `/claim`, `/content/*`.
- **Nội dung bài học trả phí nằm ở R2**: bản tải về chỉ có bài 1 miễn phí. `GET /content/vocab/:lang` chỉ gửi khi người dùng còn Premium và có khóa học (`access:<lang>`) của ngôn ngữ đó, admin luôn xem được. Người đã được gửi nội dung thì vẫn chép lại được, máy chủ không ngăn được điều đó; chưa có giới hạn tải theo người (nên bật Rate limiting cho `/content/*`).
- Khóa phím F12/chuột phải trong app chỉ là lớp cản trở người dùng thường, không phải bảo vệ.

## Triển khai (một lần, miễn phí, không cần thẻ)
1. Tạo tài khoản Cloudflare, cài `wrangler`, `wrangler login`.
2. `wrangler d1 create windtp` rồi dán `database_id` vào `wrangler.toml`.
3. Sửa `FIREBASE_PROJECT_ID` và `ALLOWED_ORIGIN` (địa chỉ trang WINDTP, không có dấu `/` cuối) trong `wrangler.toml`.
4. `wrangler d1 execute windtp --remote --file=schema.sql`
5. `wrangler r2 bucket create windtp-content` (R2 cần thêm thẻ thanh toán trong Cloudflare; mức miễn phí 10GB), rồi sau khi `npm run build` chạy `npm run content:upload`
6. `wrangler deploy`
7. Nạp bảng giá: gọi `PUT /admin/catalog` bằng tài khoản admin với `{ "items": [{ "id", "kind", "name", "price" }] }`.

## API
`GET /me`, `POST /profile/birth`, `POST /claim {taskId}`, `POST /chips/exchange {xu}`, `POST /purchase {itemId}`,
`POST /orders {kind: topup|plan|shop, currency, amount, planId, code}`, `GET /orders/mine`, `POST /posts {text}`, `GET /posts`;
admin: `GET /admin/orders`, `POST /admin/orders/:id/approve|reject`, `GET /admin/posts`, `POST /admin/posts/:id/approve|reject`, `PUT /admin/catalog`, `PUT /admin/tasks`, `GET /tasks`, `POST /admin/grant {email, xu, chips, note}`, `POST /admin/devices/reset {uid}`.
Người dùng: `GET /referral`, `POST /referral/redeem {code}`, `POST /session/claim`, `GET /devices`; admin: `GET /admin/devices/:uid`. Mọi yêu cầu của người dùng (không phải admin) phải có header `X-Device-Id` (16–64 ký tự `A-Za-z0-9_-`) và `X-Session-Key` (32 ký tự, lấy từ `POST /session/claim`).
Đơn `shop` nhận thêm `lines [{id, qty}]` và `contact`; duyệt đơn nhận `grants`, `xu`, `chips`, `premiumMonths` (có trần).

## Nối với app
Build production cần địa chỉ máy chủ (https): đặt biến môi trường `WINDTP_API_URL` hoặc tạo `api.config.json` dạng `{"url": "https://windtp.<tên>.workers.dev"}`.
Địa chỉ được nhúng vào trang và vào `connect-src` của CSP. Khi nâng cấp bản cũ nhớ chạy lại `schema.sql` trên D1 (thêm bảng `device_months`, `user_sessions`, `ref_codes`, `referrals`, `listing_contacts`, `threads`, `messages`; bảng `active_sessions` của bản thử trước, nếu có, không còn dùng và có thể xóa) và triển khai máy chủ cùng lúc với bản app mới. Sau khi triển khai nhớ: đặt `ALLOWED_ORIGIN` đúng địa chỉ trang, gán claim `admin` cho tài khoản chủ,
và gửi header `Content-Security-Policy: frame-ancestors 'none'` ở nơi host trang (thẻ meta không đặt được `frame-ancestors`).
Test: `python3 tests/smoke_economy.py` chạy app thật với máy chủ này (SQLite), gồm cả kịch bản sửa localStorage.

## Chống lạm dụng & báo cáo nội dung

- Giới hạn tần suất theo người dùng lưu ở bảng `rate_limits` (cửa sổ cố định): nạp/nhận thưởng, đơn hàng, nội dung, đồng bộ hồ sơ, thích, bình luận (10/phút + 30/ngày). Admin được miễn. Giới hạn theo IP vẫn phải đặt bằng luật Rate limiting của Cloudflare.
- `PUT /me/state` kiểm tra kiểu từng khóa (400 `bad-state`).
- Tên hiển thị chứa từ dành riêng (admin, windtp, quản trị...) bị thay bằng "Người dùng"; bình luận của admin có cờ `admin`.
- Bảng tin chỉ trả 30 bình luận mới nhất mỗi bài (`commentsTotal` là tổng).
- `POST /reports {kind: post|comment|listing, id, reason}` (20/ngày, mỗi người một báo cáo/nội dung); admin: `GET /admin/reports`, `POST /admin/reports/:id/resolve {remove}`.
- Cấu trúc DB: `schema.sql` cho cài mới, `migrations/` cho DB đang chạy (`wrangler d1 migrations apply`).


## Chống spam trong chat
Mỗi tin tối đa 2 đường dẫn; cùng một nội dung gửi quá 2 lần trong 10 phút bị từ chối (`400 spam`). Kèm giới hạn 40 tin / 10 phút.

## Chặn theo người
Khi người đăng chặn một người mua ở bất kỳ cuộc trò chuyện nào, người đó không mở thêm cuộc trò chuyện mới ở các tin khác của cùng người đăng (`403 blocked`). Bỏ chặn ở cuộc trò chuyện đó thì được mở lại.

## Webhook ngân hàng (SePay)
`POST /webhooks/sepay` (xác thực `Authorization: Apikey <SEPAY_API_KEY>`, so sánh thời gian cố định) tự duyệt đơn nạp Xu VND khi nội dung chuyển khoản có mã `WIND2xxxx`/`WIND3xxxx` của đúng một đơn đang chờ và số tiền bằng đúng số tiền đơn. Mỗi giao dịch ngân hàng chỉ xử lý một lần (`bank_events.bank_id`); các giao dịch không tự khớp được xem ở `GET /admin/bank-events`. Việc duyệt dùng chung hàm với nút duyệt của admin nên có cùng các bảo vệ (khóa chống duyệt trùng, giao dịch nguyên tử). Hướng dẫn cài đặt: `docs/DEPLOY.md`.
