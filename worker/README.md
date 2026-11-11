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
- **App chưa gọi máy chủ này.** Cho tới khi nối xong (xem dưới), Xu/Premium trong app vẫn nằm ở localStorage.

## Triển khai (một lần, miễn phí, không cần thẻ)
1. Tạo tài khoản Cloudflare, cài `wrangler`, `wrangler login`.
2. `wrangler d1 create windtp` rồi dán `database_id` vào `wrangler.toml`.
3. Sửa `FIREBASE_PROJECT_ID` và `ALLOWED_ORIGIN` (địa chỉ trang WINDTP, không có dấu `/` cuối) trong `wrangler.toml`.
4. `wrangler d1 execute windtp --remote --file=schema.sql`
5. `wrangler deploy`
6. Nạp bảng giá: gọi `PUT /admin/catalog` bằng tài khoản admin với `{ "items": [{ "id", "kind", "name", "price" }] }`.

## API
`GET /me`, `POST /profile/birth`, `POST /claim {taskId}`, `POST /chips/exchange {xu}`, `POST /purchase {itemId}`,
`POST /orders {kind: topup|plan|shop, currency, amount, planId, code}`, `GET /orders/mine`, `POST /posts {text}`, `GET /posts`;
admin: `GET /admin/orders`, `POST /admin/orders/:id/approve|reject`, `GET /admin/posts`, `POST /admin/posts/:id/approve|reject`, `PUT /admin/catalog`.

## Việc còn lại để dùng được
Nối app vào các endpoint trên: bỏ ghi `balance/chips/premium/orders` vào localStorage ở 16 chỗ trong `src/js`
(chủ yếu `quiz-cert-payment.js`, `lofi-radio.js`), thay bằng gọi API rồi hiển thị số liệu máy chủ trả về.
Việc này cần build và chạy smoke test trình duyệt nên làm ở phiên có cài được gói.

## Kế hoạch nối app (đã khảo sát)
Chỗ ghi ví trong app: `earn()/spend()` (`lofi-radio.js`), thưởng nhiệm vụ và nạp Xu (`quiz-cert-payment.js`),
duyệt đơn/Premium (`user-admin-orders.js`, `orders-friend-search.js`, `shared-player-data-chat.js`) và
`setChips`/`xuToChips` của game bài (`card-game-quan-hung.js`). Toàn bộ là code đồng bộ gắn chặt vào giao diện,
trong khi API là bất đồng bộ, nên cần đổi sang mô hình: gọi API -> nhận ví từ máy chủ -> vẽ lại.

Quyết định thiết kế:
1. **Máy chủ giữ Xu, Premium, đơn hàng, kiểm duyệt** (có giá trị tiền thật). Đây là phần bắt buộc.
2. **Chip game chỉ để giải trí, không đổi thưởng** (app đã ghi rõ). Thắng/thua chip diễn ra trong trình duyệt nên
   máy chủ không kiểm chứng được; để chip ở phía người dùng, chỉ việc đổi Xu sang chip đi qua `POST /chips/exchange`.
   Nếu sau này chip có giá trị thật thì phải chuyển cả game bài sang chạy trên máy chủ.
3. Lúc đăng nhập tải `GET /me` làm nguồn sự thật; ghi vào localStorage chỉ là bản chép để hiển thị.
4. Không có máy chủ (mất mạng) thì khóa các thao tác tiền, không cho thao tác tạm trên máy.
5. Cần test trình duyệt cho luồng ví (hiện CI chưa có test nào cho ví/giỏ hàng) trước khi gỡ code cũ.
