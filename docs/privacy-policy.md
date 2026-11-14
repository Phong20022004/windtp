# Chính sách quyền riêng tư của WINDTP (BẢN NHÁP)

> **Bản nháp kỹ thuật, chưa phải văn bản pháp lý.** Soạn dựa trên cách ứng dụng thực sự xử lý dữ liệu tại thời điểm viết. Cần luật sư (am hiểu Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và, nếu có người dùng ở nước khác, luật nơi đó) xem lại, điền các chỗ `[...]` và bổ sung trước khi công bố. Nếu cách ứng dụng xử lý dữ liệu thay đổi, phải cập nhật văn bản này.

Cập nhật lần cuối: `[ngày]`. Đơn vị vận hành: `[tên pháp nhân / cá nhân, địa chỉ, email liên hệ]`.

## 1. Dữ liệu chúng tôi thu thập
**Khi đăng ký và đăng nhập:** tên hiển thị, email, mã người dùng (uid) do Firebase Authentication cấp; nếu đăng nhập bằng Google thì thông tin cơ bản của tài khoản Google do Google cung cấp. Mật khẩu do Firebase quản lý, chúng tôi không đọc được.

**Khi dùng ví và cửa hàng:** số dư Xu và chip, thời hạn Premium, quyền học đã mua, lịch sử giao dịch; đơn hàng (loại, số tiền, mã đơn, tóm tắt), cùng thông tin liên hệ bạn nhập khi đặt hàng như địa chỉ nhận hàng, số điện thoại, email nhận tài liệu. Ngày sinh nếu bạn khai để dùng tính năng đổi chip (dùng để kiểm tra độ tuổi).

**Khi dùng cộng đồng:** bài viết, bình luận, lượt thích, tin rao vặt (kèm địa chỉ, số điện thoại, Facebook, Zalo nếu bạn nhập), tin nhắn trực tiếp giữa người dùng, báo cáo vi phạm bạn gửi.

**Tiến độ học và cài đặt:** tiến độ, từ đã lưu, cài đặt, tiến độ bảng chữ cái; được đồng bộ giữa các thiết bị của bạn.

**Dữ liệu kỹ thuật:** mã thiết bị ngẫu nhiên do ứng dụng tạo, thiết bị đã dùng theo tháng (để giới hạn số thiết bị), khóa phiên, bộ đếm tần suất yêu cầu. `[Bổ sung nếu dùng thêm phân tích, nhật ký truy cập, IP do Cloudflare ghi]`.

## 2. Mục đích sử dụng
Cung cấp tài khoản, ví, mua hàng và học tập; duyệt và hiển thị nội dung cộng đồng; giao hàng/gửi tài liệu; chống gian lận và lạm dụng (giới hạn thiết bị, giới hạn tần suất, kiểm duyệt); đối soát thanh toán; hỗ trợ người dùng. Chúng tôi `[không bán dữ liệu cá nhân / điền theo thực tế]`.

## 3. Ai nhìn thấy dữ liệu
- **Công khai với người dùng đã đăng nhập:** tên hiển thị, bài viết, bình luận đã duyệt, tin rao đã duyệt và thông tin liên hệ bạn chọn điền trong tin đó. **Hãy chỉ đưa vào tin đăng những thông tin bạn sẵn sàng công khai** (đặc biệt địa chỉ nhà riêng).
- **Quản trị viên:** xem đơn hàng, thông tin liên hệ giao hàng, nội dung chờ duyệt và báo cáo vi phạm để xử lý.
- **Nhà cung cấp hạ tầng xử lý dữ liệu thay mặt chúng tôi:** Google (Firebase Authentication), Cloudflare (Workers, D1, R2). Dữ liệu có thể được lưu và xử lý ở máy chủ ngoài Việt Nam. `[Luật sư xem điều kiện chuyển dữ liệu ra nước ngoài]`.
- Cơ quan có thẩm quyền khi pháp luật yêu cầu.

## 4. Thời gian lưu trữ
Dữ liệu tài khoản được lưu cho tới khi bạn xóa tài khoản. Sau khi xóa: số dư, giao dịch, bài viết, bình luận, tin đăng, tin nhắn và hồ sơ đồng bộ bị xóa khỏi cơ sở dữ liệu đang chạy. Chúng tôi giữ lại: (a) đơn hàng đã gỡ tên, email và thông tin liên hệ, để đối soát tiền và nghĩa vụ kế toán `[thời hạn theo luật]`; (b) một số khóa chống lạm dụng không chứa nội dung cá nhân (đã nhận thưởng nào, hạn mức theo ngày, thiết bị theo tháng, đã nhập mã mời) vì nếu xóa thì tài khoản có thể nhận lại thưởng; `[thời hạn]`. Bản sao lưu có thể còn dữ liệu cũ tới `[số ngày]` ngày rồi bị xóa theo chu kỳ.

## 5. Quyền của bạn
Trong ứng dụng, mục **Cài đặt → Dữ liệu của tôi**, bạn có thể:
- **Tải bản sao dữ liệu** đã gửi lên máy chủ (file JSON).
- **Xóa tài khoản** (không hoàn tác; mất số dư Xu, quyền học và Premium đã mua).

Ngoài ra bạn có thể yêu cầu truy cập, chỉnh sửa, hạn chế hoặc phản đối việc xử lý, rút lại sự đồng ý, qua email `[email liên hệ]`. Thời hạn phản hồi `[theo luật]`. Quyền chỉnh sửa tên hiển thị: `[mô tả cách đổi]`.

## 6. Người dưới 18 tuổi
Tính năng đổi chip có hạn mức thấp hơn cho người dưới 18 và yêu cầu ngày sinh. `[Luật sư: quy định về dữ liệu của trẻ em, tuổi tối thiểu, sự đồng ý của cha mẹ/người giám hộ.]`

## 7. Bảo mật
Kết nối được mã hóa (HTTPS); mật khẩu do Firebase quản lý; máy chủ kiểm tra mọi yêu cầu bằng token đã ký, giới hạn tần suất theo tài khoản, và chỉ quản trị viên mới duyệt đơn. Không hệ thống nào an toàn tuyệt đối; nếu xảy ra sự cố ảnh hưởng dữ liệu cá nhân, chúng tôi sẽ thông báo theo quy định `[quy trình và thời hạn thông báo]`.

## 8. Cookie và lưu trữ trên thiết bị
Ứng dụng dùng bộ nhớ của trình duyệt (localStorage) để lưu phiên đăng nhập, tiến độ học và cài đặt trên máy bạn. Xóa dữ liệu trình duyệt sẽ xóa các dữ liệu này trên máy (dữ liệu đã đồng bộ vẫn còn ở máy chủ). `[Bổ sung nếu dùng cookie phân tích/quảng cáo.]`

## 9. Thay đổi chính sách
Khi thay đổi quan trọng, chúng tôi sẽ thông báo trong ứng dụng. `[Điều khoản sử dụng, quy định hoàn tiền, quy định nội dung bị cấm: nên có văn bản riêng.]`

## Phụ lục kỹ thuật cho người rà soát
| Bảng dữ liệu | Nội dung | Xóa khi xóa tài khoản? |
|---|---|---|
| wallets, tx, entitlements | ví, sổ giao dịch, quyền sở hữu | Có |
| orders | đơn hàng | Giữ, đã gỡ tên/email/liên hệ |
| posts, post_comments, post_likes | nội dung cộng đồng | Có (kể cả bình luận và lượt thích trên bài của bạn) |
| listings, listing_contacts | tin rao và liên hệ | Có |
| threads, messages, thread_blocks, thread_reports | tin nhắn trực tiếp (cả hai chiều), chặn và báo cáo cuộc trò chuyện | Có |
| profiles | tiến độ học, cài đặt đồng bộ | Có |
| user_sessions, ref_codes, rate_limits, reports | phiên, mã mời, bộ đếm, báo cáo bạn gửi | Có |
| claims, chip_daily, device_months | chống lạm dụng, không chứa nội dung | Giữ |
| referrals | quan hệ mời bạn | Giữ phía người được mời; phía người mời đổi thành "deleted" |
