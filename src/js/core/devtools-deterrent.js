(function () {
  // Chỉ là lớp cản trở người dùng thường: người rành vẫn mở được công cụ nhà phát triển bằng menu trình duyệt.
  // Bảo vệ nội dung trả phí nằm ở máy chủ (worker/), không ở đây.
  function blocked(e) {
    const k = String(e.key || "").toLowerCase();
    if (e.key === "F12") return true;
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === "i" || k === "j" || k === "c")) return true;
    if (e.metaKey && e.altKey && (k === "i" || k === "j" || k === "c" || k === "u")) return true;
    if (e.ctrlKey && !e.shiftKey && k === "u") return true;
    return false;
  }
  window.addEventListener("keydown", function (e) { if (blocked(e)) { e.preventDefault(); e.stopPropagation(); } }, true);
  // Giữ menu chuột phải ở ô nhập liệu để vẫn dán/sao chép được (cần cho điện thoại và trợ năng).
  window.addEventListener("contextmenu", function (e) {
    const t = e.target;
    if (t && t.closest && t.closest("input, textarea, select, [contenteditable='true']")) return;
    e.preventDefault();
  }, true);
})();
