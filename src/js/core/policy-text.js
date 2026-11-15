  // Điều khoản và chính sách quyền riêng tư hiển thị trong app (màn đăng ký, Cài đặt). Đây là bản tóm tắt đúng với cách app đang xử lý dữ liệu;
  // văn bản pháp lý đầy đủ do đơn vị vận hành công bố (xem docs/privacy-policy.md). Khi cách xử lý dữ liệu đổi, phải sửa file này.
  const WINDTP_DOCS = {
    terms: {
      title: "Điều khoản sử dụng",
      items: [
        ["Mục đích", "WINDTP là ứng dụng học tập kèm cửa hàng và cộng đồng. Hãy dùng đúng mục đích học tập và giao tiếp lành mạnh."],
        ["Nội dung bạn đăng", "Bài viết, bình luận, tin rao và tin nhắn phải đúng sự thật và không vi phạm pháp luật. Không đăng nội dung lừa đảo, spam, xúc phạm, phản cảm hay thông tin cá nhân của người khác. Quản trị viên có thể gỡ nội dung vi phạm và khóa tài khoản vi phạm nhiều lần."],
        ["Xu, chip và Premium", "Xu và chip là điểm dùng trong ứng dụng, không phải tiền và không quy đổi ra tiền. Đơn nạp và đơn mua hàng chỉ có hiệu lực sau khi thanh toán được xác nhận. Gian lận (nhận thưởng nhiều lần, dùng nhiều tài khoản, can thiệp hệ thống) có thể bị hủy thưởng và khóa tài khoản."],
        ["Tài khoản", "Bạn chịu trách nhiệm giữ kín mật khẩu. Mỗi tài khoản dùng được trên một số thiết bị giới hạn mỗi tháng. Bạn có thể xóa tài khoản bất cứ lúc nào trong Cài đặt."],
        ["Thay đổi", "Điều khoản có thể thay đổi; thay đổi quan trọng sẽ được thông báo trong ứng dụng."],
      ],
    },
    privacy: {
      title: "Chính sách quyền riêng tư",
      items: [
        ["Dữ liệu được thu thập", "Tên hiển thị, email và mã người dùng khi đăng ký; số dư Xu và chip, giao dịch, đơn hàng; thông tin liên hệ bạn nhập khi đặt hàng (địa chỉ, số điện thoại, email nhận tài liệu); ngày sinh nếu bạn khai để đổi chip; bài viết, bình luận, tin rao, tin nhắn; tiến độ học và cài đặt; mã thiết bị ngẫu nhiên để giới hạn số thiết bị."],
        ["Nơi lưu", "Một phần lưu ngay trên trình duyệt của bạn; phần còn lại được gửi lên máy chủ của WINDTP (Cloudflare) để ví, đơn hàng, cộng đồng và đồng bộ giữa các thiết bị hoạt động. Đăng nhập do Google Firebase xử lý; mật khẩu do Firebase quản lý và WINDTP không đọc được. Dữ liệu có thể được xử lý ở máy chủ ngoài Việt Nam."],
        ["Ai nhìn thấy", "Mọi người dùng đã đăng nhập thấy tên hiển thị, bài viết, bình luận và tin rao đã duyệt, kể cả thông tin liên hệ bạn điền trong tin rao: chỉ điền thông tin bạn sẵn sàng công khai. Quản trị viên xem đơn hàng, thông tin giao hàng, nội dung chờ duyệt và báo cáo vi phạm để xử lý. Dữ liệu chỉ được cung cấp cho cơ quan có thẩm quyền khi pháp luật yêu cầu."],
        ["Quyền của bạn", "Vào Cài đặt, mục Dữ liệu của tôi để tải bản sao dữ liệu đã gửi lên máy chủ hoặc xóa vĩnh viễn tài khoản (mất số dư, quyền học và Premium đã mua)."],
        ["Sau khi xóa tài khoản", "Ví, giao dịch, bài viết, bình luận, tin rao, tin nhắn và dữ liệu đồng bộ bị xóa. Đơn hàng cũ được giữ để đối soát tiền nhưng đã gỡ tên, email và thông tin liên hệ. Một số khóa chống lạm dụng (đã nhận thưởng nào, thiết bị theo tháng) được giữ lại và không chứa nội dung cá nhân."],
      ],
    },
  };
  function docBodyHtml(key) {
    const d = WINDTP_DOCS[key];
    return d ? d.items.map((it) => `<div><p class="font-extrabold text-slate-800">${it[0]}</p><p class="text-slate-600 leading-relaxed">${it[1]}</p></div>`).join("") : "";
  }
