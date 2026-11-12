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
- **Bài đăng cộng đồng do máy chủ giữ và kiểm duyệt** (admin đăng hiện ngay, người dùng chờ duyệt, chỉ chủ bài hoặc admin xóa được). **Lượt thích, bình luận và tin rao vặt (Chợ đồ cũ, Việc làm, Phòng trọ) vẫn chỉ lưu trên từng máy**: chưa có kiểm duyệt thật cho tin rao vặt.
- Email chỉ được ghi vào ví (để admin cộng thưởng theo email) khi Firebase xác nhận `email_verified`.
- **Chip thắng trong game** chỉ lưu ở trình duyệt (không quy ra tiền, không đổi lại Xu). Chip do máy chủ cấp (đổi từ Xu, thưởng, gói Premium) vẫn do máy chủ giữ.
- Thưởng chia sẻ Facebook (1.000 Xu/kỳ nửa tháng, link không dùng lại) và nhiệm vụ đặc biệt (admin đăng bằng `PUT /admin/tasks`) chạy qua đơn `fbshare`/`ctask`: admin xem link/ảnh rồi duyệt, máy chủ tự quyết số thưởng. Tiền thật của nhiệm vụ vẫn do admin chuyển khoản thủ công.
- **Chưa chuyển sang máy chủ**: hoa hồng giới thiệu (cần ánh xạ ID `WIND-…` sang tài khoản thật), hiện báo "tạm thời chưa dùng được".
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
admin: `GET /admin/orders`, `POST /admin/orders/:id/approve|reject`, `GET /admin/posts`, `POST /admin/posts/:id/approve|reject`, `PUT /admin/catalog`, `PUT /admin/tasks`, `GET /tasks`, `POST /admin/grant {email, xu, chips, note}`.
Đơn `shop` nhận thêm `lines [{id, qty}]` và `contact`; duyệt đơn nhận `grants`, `xu`, `chips`, `premiumMonths` (có trần).

## Nối với app
Build production cần địa chỉ máy chủ (https): đặt biến môi trường `WINDTP_API_URL` hoặc tạo `api.config.json` dạng `{"url": "https://windtp.<tên>.workers.dev"}`.
Địa chỉ được nhúng vào trang và vào `connect-src` của CSP. Sau khi triển khai nhớ: đặt `ALLOWED_ORIGIN` đúng địa chỉ trang, gán claim `admin` cho tài khoản chủ,
và gửi header `Content-Security-Policy: frame-ancestors 'none'` ở nơi host trang (thẻ meta không đặt được `frame-ancestors`).
Test: `python3 tests/smoke_economy.py` chạy app thật với máy chủ này (SQLite), gồm cả kịch bản sửa localStorage.
