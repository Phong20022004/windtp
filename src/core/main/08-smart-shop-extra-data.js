  // ===== Gian hàng thông minh: dữ liệu bổ sung, minh họa sản phẩm, gợi ý, sắp xếp =====
  var PRODUCT_META = {};
  function meta(p) { return PRODUCT_META[p.id] || (p.custom ? { tag: "new", sub: p.sub || "" } : p.sub ? { sub: p.sub } : {}); }
  function soldNum(p) { return p.custom ? 1e9 : (meta(p).sold || 0); }
  function soldLine(p) {
    if (p.custom) return "✨ Hàng mới";
    const n = soldNum(p);
    return n ? "Đã bán " + (n >= 1000 ? (n / 1000).toFixed(1).replace(".", ",") + "k" : n) : "";
  }
  var SA = 'font-family="Inter,Arial,sans-serif" font-weight="900"';
  function LG(id, a, b, h) { return '<linearGradient id="pa-' + id + '" x1="0" y1="0" x2="' + (h ? 0 : 1) + '" y2="' + (h ? 1 : 0) + '"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; }
  function ARTW(id, c1, c2, defs, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="pb-' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient>' + defs + '</defs><rect width="120" height="100" fill="url(#pb-' + id + ')"/><ellipse cx="60" cy="88" rx="38" ry="5" fill="#000" opacity=".13"/>' + inner + '</svg>';
  }
  var FOODBG = ["#fff7ed", "#fed7aa"], FASHBG = ["#fdf2f8", "#fbcfe8"], TECHBG = ["#eff6ff", "#c7d2fe"], SUPPBG = ["#ecfdf5", "#a7f3d0"], STUDYBG = ["#fffbeb", "#fde68a"];
  var PRODUCT_ART = {};
  var ARTCACHE = {};
  function productArt(p) {
    const f = PRODUCT_ART[p.id];
    if (!f) return "";
    return ARTCACHE[p.id] || (ARTCACHE[p.id] = f());
  }
