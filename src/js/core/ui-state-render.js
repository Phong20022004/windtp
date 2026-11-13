  var STALL_STYLE = {
    food: { bg: "#dcf5d0", grad: "linear-gradient(180deg,#8fd45a,#f5a54a)", ink: "#1f2937" },
    fashion: { bg: "#fbd0ec", grad: "linear-gradient(180deg,#f6a6d8,#b77be6)", ink: "#1f2937" },
    tech: { bg: "#cfeefb", grad: "linear-gradient(180deg,#7fd0f7,#5aa8f0)", ink: "#1f2937" },
    supp: { bg: "#f3f6b5", grad: "linear-gradient(180deg,#e8ef7a,#7fd46a)", ink: "#1f2937" },
    study: { bg: "#cfe9ea", grad: "linear-gradient(180deg,#2f8f9a,#1d5563)", ink: "#ffffff" }
  };
  (function () {
    const st = document.createElement("style");
    st.textContent = ".stall-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}.stall-mini{display:flex;flex-direction:column;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.16);transition:transform .15s,opacity .15s,box-shadow .15s}.stall-mini.dim{opacity:.7}.stall-mini.on{opacity:1;transform:translateY(-2px);box-shadow:0 0 0 2px #0ea5e9,0 6px 12px rgba(14,165,233,.35)}.stall-mini-img{display:block;aspect-ratio:1/.8;overflow:hidden}.stall-mini-img img{width:100%;height:100%;object-fit:cover;display:block}.stall-mini-label{display:flex;align-items:center;justify-content:center;min-height:30px;padding:2px 3px;font-size:9px;font-weight:900;line-height:1.1;text-align:center}@media(min-width:640px){.stall-mini-label{font-size:11px;min-height:34px}}.sakura-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}.sakura-p{position:absolute;top:-12px;width:9px;height:9px;background:radial-gradient(circle at 30% 30%,#fff,#ffb3cf);border-radius:80% 0 80% 0;opacity:.9;animation:sakuraFall linear infinite}@keyframes sakuraFall{0%{transform:translate3d(0,-10px,0) rotate(0)}50%{transform:translate3d(26px,85px,0) rotate(180deg)}100%{transform:translate3d(-14px,175px,0) rotate(360deg)}}@media(prefers-reduced-motion:reduce){.sakura-p{animation:none;opacity:.5;top:30px}}#banner-wrap{touch-action:pan-y}";
    document.head.appendChild(st);
  })();
  function stallAvatar(k, px) {
    const img = STALL_IMG[k], st = STALL_STYLE[k];
    if (!img) return "";
    const coin = k === "study" ? `<span style="position:absolute;right:-1px;bottom:-1px;width:${Math.round(px * 0.38)}px;height:${Math.round(px * 0.38)}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fde68a,#f59e0b);border:2px solid #fff;color:#92400e;font:900 ${Math.round(px * 0.22)}px/${Math.round(px * 0.34)}px Inter,Arial,sans-serif;text-align:center">W</span>` : "";
    return `<span role="img" aria-label="${STALLS[k].name}" style="position:relative;display:inline-block;flex:0 0 auto;width:${px}px;height:${px}px"><span style="display:block;width:100%;height:100%;border-radius:${Math.round(px * 0.28)}px;overflow:hidden;box-shadow:0 2px 7px rgba(15,23,42,.25),0 0 0 2px #fff;background:${st.bg}"><img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></span>${coin}</span>`;
  }
  function productThumb(p, cls) {
    const m = meta(p);
    const badge = m.tag === "hot" ? '<span class="ws-badge ws-hot">🔥 Bán chạy</span>' : m.tag === "new" ? '<span class="ws-badge ws-new">✨ Mới</span>' : "";
    return thumb(p.img, p.emoji, cls, p.img ? "" : productArt(p)).replace(/<\/div>$/, badge + "</div>");
  }
  function sortedProducts(list) {
    const price = (p) => p.price[state.settings.currency];
    const arr = list.slice();
    if (ui.shopSort === "low") arr.sort((a, b) => price(a) - price(b));
    else if (ui.shopSort === "high") arr.sort((a, b) => price(b) - price(a));
    else if (ui.shopSort === "new") arr.sort((a, b) => (meta(b).tag === "new") - (meta(a).tag === "new") || soldNum(b) - soldNum(a));
    else arr.sort((a, b) => soldNum(b) - soldNum(a));
    return arr;
  }
  function matchesShop(p, q) { return !q || norm(p.name + " " + p.desc + " " + (meta(p).sub || "")).includes(q); }
  function filteredProducts() {
    const q = norm(ui.shopQuery);
    return sortedProducts(PRODUCTS.filter((p) => !p.docOf && (ui.shopCat === "all" ? (!p.plan || !!q) : (p.cat === ui.shopCat && (!p.lang || p.lang === ui.courseLang))) && (!ui.shopSub || ui.shopCat === "all" || meta(p).sub === ui.shopSub) && matchesShop(p, q)));
  }
  function emptyShop() {
    const q = norm(ui.shopQuery);
    const other = q && ui.shopCat !== "all" ? PRODUCTS.filter((p) => !p.docOf && p.cat !== ui.shopCat && matchesShop(p, q)).length : 0;
    const more = other ? ` Có <b>${other}</b> kết quả ở các gian khác. <button data-action="shop-cat" data-cat="all" class="ws-chip" data-on="1">Xem tất cả các gian</button>` : "";
    if (!q) return `<p class="col-span-full text-center text-sm text-slate-500 py-10">${ui.shopCat === "all" ? "Hãy chọn một gian hàng ở trên để xem sản phẩm." : ui.shopSub ? "Danh mục này chưa có sản phẩm. Sản phẩm sẽ sớm được cập nhật." : "Gian hàng này chưa có sản phẩm. Sản phẩm sẽ sớm được cập nhật."}</p>`;
    return `<p class="col-span-full text-center text-sm text-slate-500 py-10">Không tìm thấy sản phẩm phù hợp.${more}</p>`;
  }
  function xuNote(price, owned) {
    if (owned) return "";
    return state.balance >= price ? ' <small class="ws-ok">✅ Đủ Xu</small>' : ` <small class="ws-lack">Thiếu ${fmt(price - state.balance)} Xu</small>`;
  }
  function shopSmartBar() {
    const subs = STALL_SUBS[ui.shopCat] || [];
    const isStudy = ui.shopCat === "study";
    const subHtml = subs.length ? `${isStudy ? "" : `<button data-action="shop-sub" data-sub="" class="ws-chip" data-on="${ui.shopSub ? 0 : 1}">Tất cả</button>`}${subs.map((s) => `<button data-action="shop-sub" data-sub="${esc(s)}" class="ws-chip" data-on="${(isStudy ? (ui.shopSub || "Khóa học") === s : ui.shopSub === s) ? 1 : 0}">${esc(s)}</button>`).join("")}` : "";
    if (isStudy && !xuView()) {
      const lg = LANGUAGES.find((l) => l.code === ui.courseLang) || LANGUAGES[0];
      const until = Number(state.courseAccess && state.courseAccess[lg.code] || 0);
      const st = until >= LIFE_TS ? "trọn đời" : until > Date.now() ? "đến " + new Date(until).toLocaleDateString("vi-VN") : "";
      const langs = LANGUAGES.map((l) => `<button data-action="course-lang" data-code="${l.code}" class="ws-chip" data-on="${l.code === lg.code ? 1 : 0}">${l.flag} ${l.name}</button>`).join("");
      const info = `<span class="ws-hint">👑 Premium: ${isPremium() ? (Number(state.premiumUntil) >= LIFE_TS ? "trọn đời" : "còn " + premiumDaysLeft() + " ngày") : "chưa mở"} · 🎰 Chip: ${fmt(state.chips || 0)}${st ? " · " + lg.name + ": " + st : ""}</span>`;
      const go = st ? `<button data-action="open-course-lang" data-code="${lg.code}" class="ws-chip" data-on="1">▶ Vào học ${lg.name}</button>` : "";
      return `<div class="ws-bar">${subHtml}</div><div class="ws-bar">${langs}</div><div class="ws-bar">${info}${go}</div><div id="shop-picks"></div>`;
    }
    if (xuView()) {
      return `<div class="ws-bar">${subHtml}<button data-action="xu-afford" class="ws-chip" data-on="${ui.xuAfford ? 1 : 0}">🪙 Chỉ món đủ Xu (bạn có ${fmt(state.balance)} Xu)</button><span class="ws-hint">Món bạn đủ Xu được xếp lên đầu.</span></div>`;
    }
    const sort = `<label class="ws-sort">Sắp xếp <select data-change="shop-sort" aria-label="Sắp xếp sản phẩm" class="ws-select">${[["smart", "Phổ biến nhất"], ["new", "Mới nhất"], ["low", "Giá thấp → cao"], ["high", "Giá cao → thấp"]].map(([v, l]) => `<option value="${v}" ${ui.shopSort === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
    return `<div class="ws-bar">${subHtml}${sort}</div><div id="shop-picks"></div>`;
  }
  function renderShopPicks() {
    const box = $("#shop-picks");
    if (!box) return;
    if (ui.shopCat !== "all" || ui.shopQuery) { box.innerHTML = ""; return; }
    const inCart = new Set(Object.keys(state.cart).filter((id) => state.cart[id] > 0));
    const cartCats = new Set(PRODUCTS.filter((p) => inCart.has(p.id)).map((p) => p.cat));
    let title, list;
    if (inCart.size) {
      title = "💡 Gợi ý mua kèm cho giỏ hàng của bạn";
      list = PRODUCTS.filter((p) => !p.plan && !p.docOf && !inCart.has(p.id)).sort((a, b) => (cartCats.has(a.cat) ? 1 : 0) - (cartCats.has(b.cat) ? 1 : 0) || soldNum(b) - soldNum(a));
    } else {
      title = "🔥 Bán chạy nhất tuần này";
      list = PRODUCTS.filter((p) => !p.plan && !p.docOf).sort((a, b) => soldNum(b) - soldNum(a));
    }
    if (!list.length) { box.innerHTML = ""; return; }
    const cur = state.settings.currency;
    box.innerHTML = `<div class="ws-title">${title}</div><div class="ws-row">${list.slice(0, 6).map((p) => `<div class="ws-pick glass-card" data-action="open-product" data-id="${p.id}"><div class="ws-th">${productThumb(p, "w-full text-4xl")}</div><div class="ws-pb"><p class="ws-pn">${esc(p.name)}</p><div class="ws-pr"><b>${money(p.price[cur], cur)}</b><button data-action="add-cart" data-id="${p.id}" aria-label="Thêm vào giỏ" class="ws-add">🛒</button></div></div></div>`).join("")}</div>`;
  }
  function xuGrid() {
    const q = norm(ui.shopQuery);
    const xr = (id, price) => (state.owned.includes(id) ? 2 : state.balance >= price ? 0 : 1);
    const okXu = (id, price) => !ui.xuAfford || state.owned.includes(id) || state.balance >= price;
    const courses = [];
    const docs = LANGUAGES.filter((l) => (!ui.shopSub || ui.shopSub === "Tài liệu") && (!q || norm("tai lieu tong hop tu vung ngu phap " + l.name).includes(q)) && okXu("doc-" + l.code, DOC_PRICE) && !hiddenProd("docm-" + l.code)).sort((a, b) => xr("doc-" + a.code, DOC_PRICE) - xr("doc-" + b.code, DOC_PRICE));
    const courseCards = courses.map((c) => {
      const owned = state.owned.includes(c.id);
      return `
    <div class="glass-card rounded-2xl p-4 flex flex-col gap-2 hover:shadow-md transition-all border-t-4 ${c.tone === "sky" ? "border-t-sky-500" : "border-t-emerald-500"}">
      <div class="flex items-center justify-between"><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${c.tone === "sky" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"}">\u{1F393} Kh\xF3a h\u1ECDc \u2022 ${c.badge}</span><span class="text-[10px] text-slate-400">${fmt(c.students + (owned ? 1 : 0))} h\u1ECDc vi\xEAn</span></div>
      <h4 class="font-bold text-xs text-slate-800">${c.title}</h4>
      <p class="text-[10px] text-slate-500 flex-1">${c.desc}</p>
      <div class="flex items-center justify-between pt-2 border-t border-slate-100">
        <span class="text-xs font-black text-amber-600">\u{1FA99} ${fmt(c.price)} Xu${xuNote(c.price, owned)}</span>
        ${owned ? `<button data-action="open-course" data-id="${c.id}" class="px-3 py-1 bg-slate-700 text-white keep-white rounded-lg text-[11px] font-bold">V\xE0o h\u1ECDc</button>` : `<button data-action="buy-course" data-id="${c.id}" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white keep-white rounded-lg text-[11px] font-bold">Mua b\u1EB1ng Xu</button>`}
      </div>
    </div>`;
    });
    const docCards = docs.map((l) => {
      const owned = state.owned.includes("doc-" + l.code);
      return `
    <div class="glass-card rounded-2xl p-4 flex flex-col gap-2 hover:shadow-md transition-all border-t-4 border-t-amber-500">
      <div class="flex items-center justify-between"><span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">\u{1F4DA} T\xE0i li\u1EC7u</span><span class="text-xl">${l.flag}</span></div>
      <h4 class="font-bold text-xs text-slate-800">T\u1ED5ng h\u1EE3p t\u1EEB v\u1EF1ng &amp; ng\u1EEF ph\xE1p ${l.name}</h4>
      <p class="text-[10px] text-slate-500 flex-1">${l.vocab.length} t\u1EEB \u2022 ${l.grammar.length} c\u1EA5u tr\xFAc \u2022 file .txt</p>
      <div class="flex items-center justify-between pt-2 border-t border-slate-100">
        <span class="text-xs font-black text-amber-600">\u{1FA99} ${fmt(DOC_PRICE)} Xu${xuNote(DOC_PRICE, owned)}</span>
        ${owned ? `<button data-action="download-doc" data-code="${l.code}" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white keep-white rounded-lg text-[11px] font-bold">\u2B07 T\u1EA3i v\u1EC1</button>` : `<button data-action="buy-doc" data-code="${l.code}" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white keep-white rounded-lg text-[11px] font-bold">Mua b\u1EB1ng Xu</button>`}
      </div>
    </div>`;
    });
    const cur = state.settings.currency;
    const all = docs.map((l, i) => {
      const owned = state.owned.includes("doc-" + l.code);
      const dp = PRODUCTS.find((x) => x.id === "docm-" + l.code);
      const moneyRow = owned || !dp ? "" : `<div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100"><span class="text-xs font-black text-sky-700">💵 ${money(dp.price[cur], cur)}</span><button data-action="buy-doc-money" data-code="${l.code}" class="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white keep-white rounded-lg text-[11px] font-bold">Mua bằng tiền</button></div>`;
      const delRow = isAdmin() ? `<div class="flex gap-1"><button data-action="pp-edit" data-id="docm-${l.code}" class="flex-1 py-1 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700">✏️ Sửa</button><button data-action="pp-del" data-id="docm-${l.code}" class="flex-1 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-600">🗑 Xóa</button></div>` : "";
      return docCards[i].replace(/<\/div>\s*$/, moneyRow + delRow + "</div>");
    });
    return all.length ? all.join("") : '<p class="col-span-full text-center text-sm text-slate-500 py-10">Kh\xF4ng t\xECm th\u1EA5y t\xE0i li\u1EC7u ph\xF9 h\u1EE3p.</p>';
  }
  function renderShopGrid() {
    const grid = $("#shop-grid");
    if (!grid) return;
    renderShopPicks();
    if (xuView()) {
      grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
      grid.innerHTML = xuGrid();
      return;
    }
    grid.className = "grid grid-cols-2 sm:grid-cols-4 gap-4";
    const list = filteredProducts();
    grid.innerHTML = list.length ? list.map((p) => {
      const qty = state.cart[p.id] ?? 0;
      return `
    <div data-action="open-product" data-id="${p.id}" class="glass-card rounded-2xl overflow-hidden hover:shadow-md transition-all">
      ${productThumb(p, "w-full h-36 text-5xl")}
      <div class="p-3">
        <h4 class="font-bold text-xs text-slate-800 line-clamp-1">${esc(p.name)}</h4>
        <p class="text-[10px] text-slate-500 line-clamp-1">${esc(p.desc)}</p>
        <p class="text-[10px] text-slate-400 mb-2">${soldLine(p)}${meta(p).sub ? " · " + esc(meta(p).sub) : ""}</p>
        ${isAdmin() ? `<div class="mb-2 flex gap-1"><button data-action="pp-edit" data-id="${p.id}" class="flex-1 py-1 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700">✏️ Sửa</button><button data-action="pp-del" data-id="${p.id}" class="flex-1 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-600">🗑 Xóa</button></div>` : ""}
        <div class="flex justify-between items-center">
          <span class="text-xs font-black text-sky-700">${money(p.price[state.settings.currency], state.settings.currency)}</span>
          <button data-action="add-cart" data-id="${p.id}" aria-label="Th\xEAm v\xE0o gi\u1ECF" class="relative px-2 py-1 bg-sky-600 text-white keep-white rounded-lg text-xs">\u{1F6D2}${qty ? `<span class="ml-1 font-bold">${qty}</span>` : ""}</button>
        </div>
      </div>
    </div>`;
    }).join("") : emptyShop();
  }
  function renderShop() {
    const el = $("#tab-shop");
    if (!el) return;
    el.innerHTML = `
  <div class="flex items-center justify-between gap-3">
    <div>
      <h2 class="text-lg font-extrabold text-slate-800">\u{1F6D2} WINDTP Official Shop</h2>
      ${isAdmin() ? '<button data-action="open-add-product" class="mb-1 px-3 py-1 rounded-lg text-[11px] font-extrabold text-white keep-white bg-gradient-to-r from-emerald-500 to-teal-600">➕ Đăng sản phẩm</button>' : ""}
      <p class="text-xs text-slate-500">5 gian hàng: thời trang, mỹ phẩm &amp; phụ kiện; đồ ăn &amp; thực phẩm; thiết bị công nghệ; thuốc &amp; thực phẩm chức năng; khóa học &amp; tài liệu.</p>
    </div>
    <button data-action="open-orders" class="relative px-3.5 py-2 bg-sky-100 text-sky-800 rounded-full text-xs font-bold whitespace-nowrap mr-1.5">📋 Đơn hàng đã đặt</button>
<button data-action="open-cart" class="relative px-3.5 py-2 bg-amber-100 text-amber-800 rounded-full text-xs font-bold whitespace-nowrap">
      \u{1F9FA} Gi\u1ECF h\xE0ng${cartCount() ? ` <span class="ml-1 px-1.5 py-0.5 bg-red-500 text-white keep-white rounded-full text-[10px]">${cartCount()}</span>` : ""}
    </button>
  </div>
  ${xuView() ? "" : `
  <div class="glass-card rounded-2xl p-2 flex flex-wrap gap-2 items-center justify-between">
    <span class="text-[11px] font-extrabold text-slate-600 px-2">Quốc gia / tiền tệ</span>
    <div class="flex gap-2 flex-wrap">
      ${[["VND","🇻🇳 Việt Nam"],["KRW","🇰🇷 Hàn Quốc"],["JPY","🇯🇵 Nhật Bản"]].map(([cur,label]) => `<button data-action="choose-store-currency" data-currency="${cur}" class="px-3 py-1.5 rounded-xl text-[11px] font-bold ${state.settings.currency === cur ? "bg-amber-500 text-white keep-white" : "bg-slate-100 text-slate-600"}">${label}</button>`).join("")}
    </div>
  </div>`}
  ${stallHeader()}
  ${xuView() ? `
  <div class="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
    <p>\u{1FA99} S\u1ED1 d\u01B0 c\u1EE7a b\u1EA1n: <b>${fmt(state.balance)} Xu</b>. Xu ch\u1EC9 d\xF9ng \u0111\u1EC3 mua <b>t\xE0i li\u1EC7u h\u1ECDc t\u1EADp</b>. Xu c\xF3 th\u1EC3 nh\u1EADn \u0111\u01B0\u1EE3c khi ho\xE0n th\xE0nh nhi\u1EC7m v\u1EE5.</p>
    <button data-action="goto" data-tab="tasks" class="px-3 py-1 rounded-lg text-[11px] font-bold bg-amber-600 text-white keep-white whitespace-nowrap shrink-0">\u{1F3AF} L\xE0m nhi\u1EC7m v\u1EE5 nh\u1EADn Xu</button>
  </div>` : `
  <div class="rounded-2xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
    <p>${payNote()}</p>
    <span class="shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold bg-white border border-sky-200 text-sky-800">${CURRENCIES[state.settings.currency].flag} ${CURRENCIES[state.settings.currency].name}</span>
  </div>`}
  <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
    <input data-input="shopq" type="search" value="${esc(ui.shopQuery)}" placeholder="T\xECm s\u1EA3n ph\u1EA9m..." class="flex-1 px-4 py-2 text-sm rounded-full border border-sky-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400">
    <div class="flex gap-2 overflow-x-auto no-scrollbar">
      ${SHOP_CATS.filter(([k]) => k === "all").map(([k, label]) => `<button data-action="shop-cat" data-cat="${k}" ${ui.shopCat === k ? 'data-active="1"' : ""} class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${ui.shopCat === k ? "bg-sky-600 text-white keep-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-sky-50"}">${STALLS[k] ? stallAvatar(k, 24) : ""}${label}</button>`).join("")}
    </div>
  </div>
  ${shopSmartBar()}
  <div id="shop-grid"></div>`;
    renderShopGrid();
    el.querySelector('[data-active="1"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }
  function matchResults() {
    const { lang, level, goal } = ui.match;
    const pool = PARTNERS.filter((p) => p.lang === lang).map((p) => ({ p, score: Math.max(30, 100 - Math.abs(p.level - level) * 22 - (p.goal === goal ? 0 : 14)) })).sort((a, b) => b.score - a.score).slice(0, 3);
    if (!pool.length) return '<p class="text-xs text-slate-500">Ch\u01B0a c\xF3 h\u1ED3 s\u01A1 ph\xF9 h\u1EE3p.</p>';
    return pool.map(({ p, score }) => {
      const invited = state.invited.includes(p.id);
      return `
    <div class="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-100">
      ${avatar(p.name, "w-10 h-10")}
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold text-slate-800">${esc(p.name)} <span class="text-emerald-600">\u2022 ${score}% h\u1EE3p</span></p>
        <p class="text-[10px] text-slate-500 truncate">${LEVELS[p.level]} \u2022 ${p.goal}</p>
        <p class="text-[10px] text-slate-400 truncate">${p.bio}</p>
      </div>
      <button data-action="invite" data-id="${p.id}" ${invited ? "disabled" : ""} class="px-2.5 py-1 rounded-lg text-[11px] font-bold ${invited ? "bg-slate-200 text-slate-500" : "bg-pink-600 text-white keep-white hover:bg-pink-700"}">${invited ? "\u0110\xE3 m\u1EDDi" : "M\u1EDDi h\u1ECDc"}</button>
    </div>`;
    }).join("");
  }
  function entSafe(fn, label) {
    try { return fn(); } catch (err) {
      try { console.error("[Giải trí] " + label, err); } catch (e2) { }
      return '<div class="glass-card p-4 rounded-2xl text-xs text-slate-500">Không tải được phần này. Hãy tải lại trang để thử lại.</div>';
    }
  }
  function renderEntertainment() {
    const el = $("#tab-entertainment");
    if (!el) return;
    const playing2 = isPlaying();
    el.innerHTML = `
  <div>
    <h2 class="text-lg font-extrabold text-slate-800">\u{1F3AE} Gi\u1EA3i Tr\xED &amp; K\u1EBFt B\u1EA1n</h2>
    <p class="text-xs text-slate-500">Nghe nhạc thư giãn và tìm bạn bè xung quanh nơi bạn ở.</p>
  </div>
  <div id="hub-card" class="glass-card wd-hub p-4 rounded-2xl space-y-3">${entSafe(hubHtml, "hub")}</div>
  <h3 class="text-base font-extrabold text-slate-800 mt-1 mb-1.5">⚔️ Thách Đấu Bạn Bè</h3><div id="duel-card">${entSafe(duelCard, "duel")}</div><h3 class="text-base font-extrabold text-slate-800 mt-1 mb-1.5">🃏 Game Bàn Bài Lá</h3><div id="bbl-card">${entSafe(bblCard, "bbl")}</div>${entSafe(() => lbButton("chips"), "lb")}<h3 class="text-base font-extrabold text-slate-800 mt-1 mb-1.5">🎧 Lofi Chill Radio</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-4">

    <div class="glass-card p-4 rounded-2xl space-y-3 border-t-4 border-t-cyan-500">
      
      <h4 class="font-bold text-sm text-slate-800">Nhạc Tập Trung Học Tập</h4>
      <p class="text-xs text-slate-500">2 bài lofi không lời và tiếng mưa êm, được tạo trực tiếp trên trình duyệt, hợp với phương pháp Pomodoro.</p>
      <div class="flex items-end gap-1 h-8 ${playing2 ? "" : "opacity-30"}" aria-hidden="true">
        ${[0, 0.2, 0.4, 0.1, 0.3, 0.5, 0.15].map((d) => `<div class="w-2 rounded-t bg-cyan-500 ${playing2 ? "eq-bar" : ""}" style="height:30%;animation-delay:${d}s"></div>`).join("")}
      </div>
      <div class="space-y-1.5" role="list" aria-label="Danh sách bài lofi">${TRACKS.map((t, i) => `<button type="button" role="listitem" data-action="radio-track" data-id="${t.id}" aria-pressed="${i === trackIdx}" class="w-full flex items-center gap-2 p-2 rounded-xl border text-left ${i === trackIdx ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-white"}"><span class="text-base">${t.emoji}</span><span class="flex-1 min-w-0"><span class="block text-xs font-bold text-slate-800">${t.name}${i === trackIdx && playing2 ? " ▶" : ""}</span><span class="block text-[10px] text-slate-500">${t.desc}</span></span></button>`).join("")}</div>
      <div class="flex items-center gap-2 text-xs"><span class="text-cyan-700 shrink-0"><svg class="spk-ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.2 9.6v4.8h3.5l4.6 3.9V5.7L7.7 9.6H4.2z" fill="currentColor" fill-opacity=".22"/><path d="M15.6 9.3a3.6 3.6 0 0 1 0 5.4"/></svg></span>
        <input data-input="volume" type="range" min="0" max="100" value="${ui.volume}" aria-label="Âm lượng" class="flex-1 accent-cyan-600"><span class="text-cyan-700 shrink-0"><svg class="spk-ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.2 9.6v4.8h3.5l4.6 3.9V5.7L7.7 9.6H4.2z" fill="currentColor" fill-opacity=".22"/><path d="M15.6 9.3a3.6 3.6 0 0 1 0 5.4"/><path d="M18.3 6.8a7.2 7.2 0 0 1 0 10.4"/></svg></span></div>
      <div class="flex gap-2">
        <button data-action="radio-prev" class="px-3 py-2 bg-white border border-cyan-300 text-cyan-700 rounded-xl text-xs font-bold" aria-label="Bài trước">⏮</button>
        <button data-action="toggle-radio" class="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white keep-white rounded-xl text-xs font-bold">${!isSupported() ? "Trình duyệt không hỗ trợ" : playing2 ? "⏸ Tạm dừng" : "▶ Phát nhạc"}</button>
        <button data-action="radio-next" class="px-3 py-2 bg-white border border-cyan-300 text-cyan-700 rounded-xl text-xs font-bold" aria-label="Bài sau">⏭</button>
      </div>
      <button data-action="open-tool" data-tool="pomodoro" class="w-full py-2 bg-white border border-cyan-300 text-cyan-700 rounded-xl text-xs font-bold">\u23F1 M\u1EDF \u0111\u1ED3ng h\u1ED3 Pomodoro</button>
    </div>
  </div>`;
  }
  var UTIL_CATS = [
    ["all", "🌟 Tất Cả"],
    ["market", "🏷️ Chợ Đồ Cũ"],
    ["jobs", "🧑‍💻 Việc Làm HS/SV"],
    ["housing", "🏡 Tìm & Nhượng Phòng"],
    ["other", "🧰 Tiện Ích Khác"],
  ];
  var SPECIAL_CATS = ["other"];
  var CUSTOM_BADGE = { label: "Danh m\u1EE5c ri\xEAng", badge: "bg-purple-100 text-purple-800", price: "text-purple-600" };
  function badgeFor(cat) {
    if (cat in LISTING_BADGE) return LISTING_BADGE[cat];
    const c = state.customCats.find((x) => x.id === cat);
    return { ...CUSTOM_BADGE, label: c ? esc(c.name) : CUSTOM_BADGE.label };
  }
  var LISTING_BADGE = {
    market: { label: "Ch\u1EE3 \u0110\u1ED3 C\u0169", badge: "bg-teal-100 text-teal-800", price: "text-teal-600" },
    jobs: { label: "Vi\u1EC7c L\xE0m", badge: "bg-blue-100 text-blue-800", price: "text-blue-600" },
    housing: { label: "Ph\xF2ng Tr\u1ECD", badge: "bg-orange-100 text-orange-800", price: "text-teal-600" }
  };
  var TASK_GOTO = { "t-duel": "entertainment", "t-lessons": "learn", "t-game": "learn", "t-win": "entertainment", "t-post": "community", "t-shop": "shop", "t-bigshop": "shop" };
  var TOOLS = [
    { id: "pomodoro", emoji: "🍅", title: "\u0110\u1ED3ng H\u1ED3 Pomodoro", sub: "T\u1EADp trung 25 ph\xFAt, ngh\u1EC9 5 ph\xFAt" },
    { id: "reminders", emoji: "🔔", title: "L\u1ECBch Nh\u1EAFc Nh\u1EDF & Th\u1EDDi Kh\xF3a Bi\u1EC3u", sub: "Ghi vi\u1EC7c c\u1EA7n l\xE0m theo ng\xE0y gi\u1EDD" },
    { id: "gpa", emoji: "🎓", title: "T\xEDnh \u0110i\u1EC3m Trung B\xECnh (GPA)", sub: "\u0110i\u1EC3m c\xF3 tr\u1ECDng s\u1ED1 theo t\xEDn ch\u1EC9" }
  ];
  function listingCard_(l) {
    const b = badgeFor(l.cat);
    return `
  <div data-action="open-listing" data-id="${l.id}" role="button" tabindex="0" class="glass-card rounded-2xl p-3.5 flex gap-3 items-center hover:shadow-md transition-all cursor-pointer">
    ${thumb(l.img, l.emoji, "w-20 h-20 rounded-xl shrink-0")}
    <div class="flex-1 min-w-0">
      <span class="text-[9px] ${b.badge} px-1.5 py-0.5 rounded font-bold">${b.label}</span>${state.saved.includes(l.id) ? ' <span class="text-[10px]">\u{1F516}</span>' : ""}
      <h4 class="text-xs font-bold text-slate-800 truncate mt-0.5">${esc(l.title)}</h4>
      <p class="text-xs font-extrabold ${b.price} mt-1">${esc(l.price)}</p>
      <p class="text-[10px] text-slate-400">${esc(l.loc)} \u2022 ${timeAgo(l.ts)}</p>
    </div>
  </div>`;
  }
  function taskCard(t) {
    const prog = Math.min(t.progress(), t.goal);
    const claimed = state.daily.claimed.includes(t.id);
    const complete = prog >= t.goal;
    let btn;
    if (claimed) btn = '<span class="text-[11px] font-bold text-slate-400">\u2713 \u0110\xE3 nh\u1EADn</span>';
    else if (complete) btn = `<button data-action="claim-task" data-id="${t.id}" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white keep-white rounded-lg text-[11px] font-bold">Nhận +${fmt(t.reward)} Xu${t.chips ? " + " + fmt(t.chips) + " chip" : ""}</button>`;
    else if (t.id === "t-checkin") btn = '<button data-action="check-in" class="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white keep-white rounded-lg text-[11px] font-bold">\u0110i\u1EC3m danh</button>';
    else btn = `<button data-action="goto" data-tab="${TASK_GOTO[t.id]}" class="px-3 py-1 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-[11px] font-bold">\u0110i t\u1EDBi</button>`;
    return `
  <div class="glass-card rounded-2xl p-3.5 flex gap-3 items-center">
    <div class="w-20 h-20 rounded-2xl wd-tile flex items-center justify-center text-3xl shrink-0" style="--c1:${(TASK_STYLE[t.id] || TASK_STYLE.def)[1]};--c2:${(TASK_STYLE[t.id] || TASK_STYLE.def)[2]}"><span class="wd-tile-i">${(TASK_STYLE[t.id] || TASK_STYLE.def)[0]}</span></div>
    <div class="flex-1 min-w-0">
      <span class="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Nhi\u1EC7m V\u1EE5 \u2022 L\xE0m m\u1EDBi m\u1ED7i ng\xE0y</span>
      <h4 class="text-xs font-bold text-slate-800 mt-0.5">${t.title}</h4>
      <p class="text-xs font-extrabold text-emerald-600">+${fmt(t.reward)} Xu${t.chips ? " + " + fmt(t.chips) + " chip" : ""} Th\u01B0\u1EDFng</p>
      <div class="flex items-center gap-2 mt-1"><div class="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden"><div class="h-full bg-emerald-500" style="width:${Math.min(100, prog / t.goal * 100)}%"></div></div><span class="text-[10px] text-slate-500 whitespace-nowrap">${t.id === "t-bigshop" ? (prog > 0 ? `${money(prog, t.currencyProgress || state.settings.currency)} / ${money(t.goal, t.currencyProgress || state.settings.currency)}` : "Chưa mua hàng") : `${prog}/${t.goal}`}</span></div>
      <div class="flex items-center justify-between mt-1.5 gap-2"><span class="text-[10px] text-slate-400 line-clamp-1">${t.hint}</span>${btn}</div>
    </div>
  </div>`;
  }
  function renderTasks_() {
    const el = $("#tab-tasks");
    if (!el) return;
    const list = tasks();
    el.innerHTML = `
      <div class="rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-5 text-white keep-white shadow-lg">
        <p class="text-xs uppercase tracking-wider font-extrabold opacity-90">WINDTP Rewards</p>
        <h2 class="text-2xl font-black mt-1">Nhiệm vụ hằng ngày</h2>
        <p class="text-sm mt-2 opacity-95">Học tập, mua sắm tại WIND Shop và nhận thưởng WIND Coin.</p>
        <div class="mt-4 flex items-center gap-2"><span class="wind-coin-mark" role="img" aria-label="WIND Coin"><span class="wind-coin-mark__w">W</span></span><span class="text-sm font-bold">Thưởng minh bạch · Làm mới mỗi ngày</span></div>
      </div>
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-3">${list.map((t) => taskCard(t)).join("")}</div>
      ${fbShareHtml()}`;
  }

  function renderUtilities() {
    const el = $("#tab-utilities");
    if (!el) return;
    const cat = ui.utilCat;
    const parts = [];
    const sortedListings = [...state.listings].filter((l) => l.status !== "pending" && l.status !== "rejected").sort((a, b) => b.ts - a.ts);
    if (cat === "all" || !SPECIAL_CATS.includes(cat)) {
      sortedListings.filter((l) => cat === "all" || l.cat === cat).filter(utilGeoOk).forEach((l) => parts.push(listingCard(l)));
    }
    const custom = state.customCats.find((c) => c.id === cat);
    if ((cat === "all" || cat === "other") && !(ui.ug && (ui.ug.q || ui.ug.country || ui.ug.region))) TOOLS.forEach((t) => parts.push(`
    <div data-action="open-tool" data-tool="${t.id}" role="button" tabindex="0" class="glass-card rounded-2xl p-3.5 flex gap-3 items-center hover:shadow-md transition-all cursor-pointer">
      <div class="w-20 h-20 rounded-2xl wd-tile flex items-center justify-center text-3xl shrink-0" style="--c1:#a78bfa;--c2:#4f46e5"><span class="wd-tile-i">${t.emoji}</span></div>
      <div class="flex-1 min-w-0">
        <span class="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">Ti\u1EC7n \xCDch Kh\xE1c</span>
        <h4 class="text-xs font-bold text-slate-800 mt-0.5">${t.title}</h4>
        <p class="text-xs font-extrabold text-purple-600 mt-1">Mi\u1EC5n Ph\xED S\u1EED D\u1EE5ng</p>
        <p class="text-[10px] text-slate-400">${t.sub}</p>
      </div>
    </div>`));
    el.innerHTML = `
  <div class="flex items-center justify-between gap-3">
    <div>
      <h2 class="text-lg font-extrabold text-slate-800">\u{1F6E0}\uFE0F Ti\u1EC7n \xCDch \u0110a N\u0103ng WINDTP</h2>
      <p class="text-xs text-slate-500">Ch\u1EE3 \u0111\u1ED3 c\u0169, vi\u1EC7c l\xE0m, ph\xF2ng tr\u1ECD v\xE0 c\xE1c ti\u1EC7n \xEDch m\u1EDF r\u1ED9ng. M\u1ECDi tin \u0111\u0103ng \u0111\u1EC1u ch\u1EDD ch\u1EE7 qu\u1EA3n ki\u1EC3m duy\u1EC7t tr\u01B0\u1EDBc khi hi\u1EC3n th\u1ECB.</p>
    </div>
    <button data-action="open-post-listing" class="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white keep-white text-xs font-bold rounded-xl shadow-sm whitespace-nowrap">+ \u0110\u0103ng tin ngay</button>
  </div>
  <div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
    ${[...UTIL_CATS, ...state.customCats.map((c) => [c.id, `${esc(c.emoji)} ${esc(c.name)}`])].map(([k, label]) => `<button data-action="util-cat" data-cat="${k}" aria-pressed="${cat === k}" class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${cat === k ? "bg-teal-600 text-white keep-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-teal-50"}">${label}</button>`).join("")}
    <button data-action="open-category" class="px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border border-dashed border-teal-400 text-teal-700 bg-white hover:bg-teal-50">\uFF0B T\u1EA1o danh m\u1EE5c</button>
  </div>
  ${custom ? `<div class="flex items-center justify-between text-xs text-slate-500"><span>Danh m\u1EE5c do b\u1EA1n t\u1EA1o: <b class="text-slate-700">${esc(custom.emoji)} ${esc(custom.name)}</b></span><button data-action="delete-category" data-id="${custom.id}" class="font-bold text-rose-500 hover:text-rose-600">X\xF3a danh m\u1EE5c</button></div>` : ""}
  ${isAdmin() ? modCard() : ""}
  ${utilSearchBar()}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${parts.join("") || '<p class="col-span-full text-center text-sm text-slate-500 py-10">Ch\u01B0a c\xF3 m\u1EE5c n\xE0o trong danh m\u1EE5c n\xE0y.</p>'}</div>`;
  }
  var POST_TAGS = ["Chung", "TOEIC", "IELTS", "HSK", "JLPT", "TOPIK", "H\u1ECFi \u0111\xE1p"];
  function authorAvatar(name, px) {
    return name === state.userName ? profileAvatar(px) : avatar(name, px >= 40 ? "w-10 h-10" : "w-7 h-7");
  }
  function postCard_(p) {
    const open = ui.openComments.has(p.id);
    const mine = p.mine === true;
    return `
  <article class="glass-card p-4 rounded-2xl space-y-3${p.admin ? " adm-post" + (Date.now() - p.ts < 8000 ? " adm-pop" : "") : ""}">
    <div class="flex items-center gap-3">
      ${p.admin && !mine ? renderPfp(p.author, ADMIN_AVATAR_ID, ADMIN_FRAME_ID, 40, { official: true }) : authorAvatar(p.author, 40)}
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-xs text-slate-800 truncate">${esc(p.author)}${p.admin ? ' <span class="adm-badge">👑 BigBoss</span>' : ""}</h4>
        <p class="text-[10px] text-slate-400">${timeAgo(p.ts)} \u2022 Chuy\xEAn m\u1EE5c ${esc(p.tag)}</p>
      </div>
      ${mine ? `<button data-action="delete-post" data-id="${p.id}" class="text-[11px] text-slate-400 hover:text-rose-500" aria-label="X\xF3a b\xE0i">X\xF3a</button>` : ""}
    </div>
    <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line break-words">${esc(p.text)}</p>
    <div class="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
      <button data-action="like-post" data-id="${p.id}" aria-pressed="${p.liked}" class="${p.liked ? "text-rose-500 font-bold" : "hover:text-sky-600"}">${p.liked ? "\u2764\uFE0F" : "\u{1F90D}"} ${p.likes} Th\xEDch</button>
      <button data-action="toggle-comments" data-id="${p.id}" class="hover:text-sky-600">\u{1F4AC} ${p.comments.length} B\xECnh lu\u1EADn</button>
    </div>
    ${open ? `
    <div class="space-y-2 pt-1">
      ${p.comments.map((c) => `<div class="flex gap-2">${authorAvatar(c.author, 28)}<div class="bg-slate-100 rounded-2xl px-3 py-1.5 min-w-0"><p class="text-[11px] font-bold text-slate-800">${esc(c.author)} <span class="font-normal text-slate-400">${timeAgo(c.ts)}</span></p><p class="text-xs text-slate-700 break-words">${esc(c.text)}</p></div>${c.mine || isAdmin() ? `<button data-action="delete-comment" data-id="${c.id}" class="text-[10px] text-slate-400 hover:text-rose-500 self-center" aria-label="Xóa bình luận">Xóa</button>` : ""}</div>`).join("")}
      <div class="flex gap-2"><input id="cmt-${p.id}" type="text" maxlength="300" placeholder="Vi\u1EBFt b\xECnh lu\u1EADn..." class="flex-1 px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400">
      <button data-action="send-comment" data-id="${p.id}" class="px-3 py-1.5 bg-sky-600 text-white keep-white rounded-full text-xs font-bold">G\u1EEDi</button></div>
    </div>` : ""}
  </article>`;
  }
  function renderCommunity() {
    const el = $("#tab-community");
    if (!el) return;
    el.innerHTML = `
  <div>
    <h2 class="text-lg font-extrabold text-slate-800">\u{1F465} C\u1ED9ng \u0110\u1ED3ng WINDTP</h2>
    <p class="text-xs text-slate-500">Bảng tin chia sẻ kinh nghiệm và hỏi đáp học thuật.</p>
  </div>
  <div class="max-w-2xl mx-auto space-y-4">

    ${isAdmin() ? modCard() : ""}${ownPendingNote()}
    <div class="glass-card p-4 rounded-2xl space-y-3">
      <div class="flex gap-3">${profileAvatar(40)}
        <textarea data-input="draft" id="post-draft" rows="2" maxlength="600" placeholder="B\u1EA1n mu\u1ED1n chia s\u1EBB \u0111i\u1EC1u g\xEC h\xF4m nay?" class="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none">${esc(ui.draft)}</textarea></div>
      <div class="flex items-center justify-between gap-2">
        <select data-change="draft-tag" aria-label="Chuy\xEAn m\u1EE5c" class="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">${POST_TAGS.map((t) => `<option ${ui.draftTag === t ? "selected" : ""}>${t}</option>`).join("")}</select>
        <button data-action="publish-post" class="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white keep-white rounded-xl text-xs font-bold">\u0110\u0103ng b\xE0i</button>
      </div>
    </div>
    ${[...state.posts].filter((p) => p.status !== "pending" && p.status !== "rejected").sort((a, b) => b.ts - a.ts).map(postCard).join("") || '<div class="com-empty"><div class="com-bubbles" aria-hidden="true"><span>💬</span><span>✨</span><span>📚</span></div><p class="com-t">Chưa có bài viết nào</p><p class="com-s">Hãy là người đầu tiên chia sẻ kinh nghiệm học của bạn!</p><button type="button" data-action="focus-draft" class="com-cta">✍️ Viết bài đầu tiên</button></div>'}
  </div>`;
  }
  function lbList(kind) {
    const FN = ["Nguyễn","Trần","Lê","Phạm","Hoàng","Vũ","Đặng","Bùi","Đỗ","Ngô"], GN = ["An","Bình","Cường","Dũng","Hà","Hiếu","Linh","Mai","Nam","Phúc","Quân","Sơn","Trang","Uyên","Vy","Yến","Long","Hoa","Tuấn","Lan"];
    let s = kind === "coin" ? 13 : 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const top = kind === "coin" ? 6e6 : 18e5, R = CULTIVATION_RANKS.length, list = [];
    for (let i = 0; i < 150; i++) {
      const g = rnd() < .5 ? "nam" : "nu";
      list.push({ name: FN[Math.floor(rnd() * 10)] + (g === "nu" ? " Thị " : " Văn ") + GN[Math.floor(rnd() * 20)], avatarId: "default", gender: g, age: 14 + Math.floor(rnd() * 40),
        realm: Math.min(R - 1, Math.floor((150 - i) / 150 * R * (0.6 + rnd() * 0.6))), val: Math.round(top * Math.pow(.955, i) * (0.9 + rnd() * 0.2)) });
    }
    const me = { me: 1, name: state.userName || "Bạn", avatarId: state.avatarId, frameId: myFrameId(), gender: state.settings.gender, age: ageFromBirth(state.settings.birth), realm: cultivationIndex(), val: Number(kind === "coin" ? state.balance : state.chips) || 0 };
    list.push(me); list.sort((a, b) => b.val - a.val);
    return { list, me, rank: list.indexOf(me) + 1 };
  }
  function lbRow(p, i, kind) {
    const gs = p.gender === "nam" ? "♂" : p.gender === "nu" ? "♀" : p.gender === "khac" ? "⚧" : "";
    const pfp = p.me ? renderPfp(p.name, p.avatarId, p.frameId, 40, {}) : renderPfp(p.name, p.avatarId, "r-" + p.realm, 40, { realm: p.realm });
    const hl = p.me ? "background:linear-gradient(90deg,#fef3c7,#fde68a);box-shadow:0 0 0 2px #f59e0b,0 0 14px rgba(245,158,11,.7);color:#78350f" : "";
    return `<div class="lb-row flex items-center gap-2 p-2 rounded-xl ${i < 3 ? "lb-r" + (i + 1) : ""} ${p.me ? "lb-me" : "bg-slate-50"}" style="--i:${Math.min(i, 30)};${hl}"><span class="w-7 text-center font-black text-sm shrink-0">${["🥇","🥈","🥉"][i] || (i + 1)}</span><div class="shrink-0">${pfp}</div><div class="flex-1 min-w-0"><p class="font-bold text-xs truncate">${esc(p.name)}${p.me ? " (Bạn)" : ""}</p><p class="text-[10px] opacity-70 truncate">${CULTIVATION_RANKS[p.realm].name}${gs ? " · " + gs : ""}${p.age >= 0 ? " · " + p.age + " tuổi" : ""}</p></div><b class="text-xs whitespace-nowrap">${fmt(p.val)} ${kind === "coin" ? "Xu" : "chip"}</b></div>`;
  }
  function lbModal() {
    const k = ui.lbTab === "coin" ? "coin" : "chips", d = lbList(k), TOPN = 50, top = d.list.slice(0, TOPN), inTop = d.rank <= TOPN;
    const tab = (id, l) => `<button data-action="lb-tab" data-k="${id}" class="flex-1 px-3 py-2 rounded-xl text-xs font-bold ${k === id ? "bg-amber-500 text-white keep-white" : "bg-slate-100 text-slate-600"}">${l}</button>`;
    const unit = k === "coin" ? "WIND Coin" : "Chip game";
    const rk = inTop ? "Xếp hạng của bạn: #" + d.rank + " · đang sáng trong bảng" : d.rank <= 100 ? "Xếp hạng của bạn: #" + d.rank + " (hạng 51–100)" : "Vô hạng (ngoài top 100)";
    const badge = d.rank <= 100 ? "#" + d.rank : "Vô hạng";
    const meRow = lbRow(d.me, d.rank - 1, k).replace(/<span class="w-7[^>]*>.*?<\/span>/, '<span class="min-w-[2.25rem] text-center font-black ' + (d.rank <= 100 ? "text-sm" : "text-[9px] leading-tight") + ' shrink-0">' + badge + "</span>").replace(/ lb-r[123] /, " ");
    return `${modalHead("🏆 Top " + TOPN + " " + unit)}<div class="p-4 space-y-3"><div class="flex gap-2">${tab("chips", "🎰 Chip game")}${tab("coin", "🪙 WIND Coin")}</div><div class="lb-list space-y-1.5" style="max-height:52vh;overflow-y:auto;overscroll-behavior:contain;padding:2px">${top.map((p, i) => lbRow(p, i, k)).join("")}</div><div class="lb-mine rounded-2xl border border-slate-200 p-3 space-y-1.5"><p class="text-[11px] font-extrabold text-slate-500">Thông tin của bạn</p>${meRow}</div><p class="text-[10px] text-slate-400 text-center">Hiển thị top ${TOPN}. Thông tin của bạn luôn hiện thứ hạng (#1–#100), ngoài top 100 là "Vô hạng". Bảng cập nhật theo số dư hiện tại của bạn.</p></div>`;
  }
  function lbButton(k) { return `<button data-action="open-lb" data-k="${k}" class="w-full mt-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 lb-btn"><span class="lb-tr">🏆</span> Bảng xếp hạng Top 50 ${k === "coin" ? "WIND Coin" : "Chip game"}</button>`; }
  
function renderWallet() {
    const el = $("#tab-wallet");
    if (!el) return;
    const monthAgo = Date.now() - 30 * 864e5;
    const recent = state.history.filter((h) => h.ts >= monthAgo);
    const totalIn = recent.filter((h) => h.kind === "in").reduce((s, h) => s + h.amount, 0);
    const totalOut = recent.filter((h) => h.kind === "out").reduce((s, h) => s + h.amount, 0);
    const list = state.history.filter((h) => ui.historyFilter === "all" || h.kind === ui.historyFilter).slice(0, 60);
    el.innerHTML = `
  <div class="p-5 rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white keep-white shadow-lg relative overflow-hidden">
    <div class="absolute -right-6 -bottom-6 text-8xl opacity-20 select-none">\u{1FA99}</div>
    <div class="flex items-center gap-2">
      <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><span class="wind-coin-letter wind-coin-letter--white" aria-hidden="true">W</span></div>
      <p class="text-xs text-amber-100 font-bold uppercase tracking-wider">S\u1ED1 D\u01B0 V\xED Bi\u1EC3u T\u01B0\u1EE3ng Xu</p>
    </div>
    <div class="text-3xl font-black mt-2">${fmt(state.balance)} <span class="text-lg font-bold text-amber-200">WIND Coin</span></div>
    <p class="text-xs text-amber-100 mt-1">🎰 Chip game: <b>${fmt(state.chips || 0)}</b></p>
    <p class="text-[11px] text-amber-100 mt-1">Xu d\xF9ng \u0111\u1EC3 mua t\xE0i li\u1EC7u, avatar v\xE0 khung avatar. Xu c\xF3 th\u1EC3 nh\u1EADn \u0111\u01B0\u1EE3c khi ho\xE0n th\xE0nh nhi\u1EC7m v\u1EE5.</p>
    <button data-action="open-lb" data-k="coin" class="lb-btn relative w-full mt-3 px-3 py-2 rounded-xl text-xs font-extrabold bg-white/20 hover:bg-white/30 border border-white/40 text-white keep-white transition-all"><span class="lb-tr">🏆</span> Bảng xếp hạng Top 50 WIND Coin</button>
    <div class="flex flex-wrap gap-3 mt-3 relative">
      <button data-action="open-topup" class="px-4 py-2 bg-white keep-white text-amber-900 rounded-xl text-xs font-extrabold shadow-md hover:bg-amber-50 transition-all">\u{1FA99} N\u1EA1p Xu</button>
      <button data-action="spend-xu" class="px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all">\u{1F3EA} Chi ti\xEAu</button>
      <button data-action="goto" data-tab="tasks" class="px-4 py-2 bg-white/20 hover:bg-white/25 border border-white/40 text-white keep-white rounded-xl text-xs font-extrabold transition-all">\u{1F3AF} Ki\u1EBFm WIND Coin</button>
    </div>
  </div>
  <div class="grid grid-cols-2 gap-3">
    <div class="glass-card p-3.5 rounded-2xl"><p class="text-[11px] text-slate-500">Thu 30 ng\xE0y qua</p><p class="text-base font-extrabold text-emerald-600">+${fmt(totalIn)} Xu</p></div>
    <div class="glass-card p-3.5 rounded-2xl"><p class="text-[11px] text-slate-500">Chi 30 ng\xE0y qua</p><p class="text-base font-extrabold text-rose-500">-${fmt(totalOut)} Xu</p></div>
  </div>
  ${typeof inviteCard === "function" ? inviteCard() : ""}
  ${state.orders.length ? `<div class="glass-card p-4 rounded-2xl">
    <h3 class="font-bold text-sm text-slate-800 flex items-center gap-2 mb-3"><span>\u{1F9FE}</span> \u0110\u01A1n H\xE0ng & N\u1EA1p Xu</h3>
    <div class="space-y-3">${state.orders.slice(0, 10).map((o) => `
      <div class="flex justify-between items-center text-xs gap-2">
        <div class="min-w-0"><p class="font-bold text-slate-800 truncate">${esc(o.summary)}</p><p class="text-[10px] text-slate-400">${fmtDateTime(o.ts)} \u2022 ${esc(o.method)}</p></div>
        <div class="text-right whitespace-nowrap"><p class="font-bold text-slate-800">${money(o.total, o.currency)}</p>${o.status === "pending" ? `<p class="text-[10px] font-bold text-amber-600">\u23F3 Ch\u1EDD x\u1EED l\xFD</p>` : o.status === "done" ? `<p class="text-[10px] font-bold text-emerald-600">\u2705 \u0110\xE3 x\xE1c nh\u1EADn</p>` : ""}</div>
      </div>`).join("")}</div>
  </div>` : ""}
  <div class="glass-card p-4 rounded-2xl">
    <div class="flex items-center justify-between mb-3 gap-2">
      <h3 class="font-bold text-sm text-slate-800 flex items-center gap-2"><span>\u{1F4DC}</span> L\u1ECBch S\u1EED Giao D\u1ECBch Xu</h3>
      <div class="flex gap-1.5">
        ${[["all", "T\u1EA5t c\u1EA3"], ["in", "Thu"], ["out", "Chi"]].map(([k, label]) => `<button data-action="history-filter" data-f="${k}" aria-pressed="${ui.historyFilter === k}" class="px-2.5 py-1 rounded-lg text-[11px] font-bold ${ui.historyFilter === k ? "bg-sky-600 text-white keep-white" : "bg-white border border-slate-200 text-slate-600"}">${label}</button>`).join("")}
      </div>
    </div>
    <div class="space-y-3">
      ${list.length ? list.map((h, i) => `
      <div class="flex justify-between items-center text-xs ${i < list.length - 1 ? "pb-2 border-b border-slate-100" : ""}">
        <div class="min-w-0 pr-2"><p class="font-bold text-slate-800 truncate">${esc(h.title)}</p><p class="text-[10px] text-slate-400">${fmtDateTime(h.ts)}</p></div>
        <span class="font-bold whitespace-nowrap ${h.kind === "in" ? "text-emerald-600" : "text-rose-500"}">${h.kind === "in" ? "+" : "-"}${fmt(h.amount)} Xu</span>
      </div>`).join("") : '<p class="text-xs text-slate-500 text-center py-4">Ch\u01B0a c\xF3 giao d\u1ECBch n\xE0o.</p>'}
    </div>
  </div>`;
  }
  function renderNotices() {
    const panel = $("#notice-panel");
    if (!panel) return;
    const items = state.notices;
    panel.innerHTML = `
  <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
    <h3 class="font-extrabold text-sm text-slate-800">Th\xF4ng b\xE1o</h3>
    <button data-action="read-all" class="text-[11px] font-semibold text-sky-600">\u0110\xE1nh d\u1EA5u \u0111\xE3 \u0111\u1ECDc</button>
  </div>
  ${items.length ? items.map((n) => `
  <div class="flex gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 ${n.read ? "" : "bg-sky-50/50"}">
    <span class="text-lg">${n.icon}</span>
    <div class="min-w-0"><p class="text-xs text-slate-700 ${n.read ? "" : "font-semibold"}">${esc(n.title)}</p><p class="text-[10px] text-slate-400">${timeAgo(n.ts)}</p></div>
  </div>`).join("") : '<p class="text-xs text-slate-500 text-center py-6">B\u1EA1n kh\xF4ng c\xF3 th\xF4ng b\xE1o m\u1EDBi n\xE0o!</p>'}`;
  }
  function search(q) {
    const n = norm(q);
    if (n.length < 2) return [];
    const hits = [];
    PRODUCTS.forEach((p) => {
      if (norm(p.name + " " + p.desc).includes(n)) hits.push({ group: "S\u1EA3n ph\u1EA9m", icon: p.emoji, title: p.name, sub: money(p.price[state.settings.currency], state.settings.currency), kind: "product", id: p.id });
    });
    COURSES.forEach((c) => {
      if (norm(c.title + " " + c.badge + " " + c.desc).includes(n)) hits.push({ group: "Kh\xF3a h\u1ECDc", icon: "\u{1F393}", title: c.title, sub: c.badge, kind: "course", id: c.id });
    });
    state.listings.forEach((l) => {
      if (norm(l.title + " " + l.desc + " " + l.loc).includes(n)) hits.push({ group: "Ti\u1EC7n \xEDch", icon: l.emoji, title: l.title, sub: `${l.price} \u2022 ${l.loc}`, kind: "listing", id: l.id });
    });
    LANGUAGES.forEach((l) => {
      if (norm(l.name).includes(n) || l.certs.some((c) => norm(c.name).includes(n))) hits.push({ group: "H\u1ECDc t\u1EADp", icon: l.flag, title: l.name, sub: l.certs.map((c) => c.name).join(", "), kind: "lang", id: l.code });
      l.vocab.forEach((v) => {
        if (norm(v.term + " " + v.meaning).includes(n)) hits.push({ group: "H\u1ECDc t\u1EADp", icon: l.flag, title: `${v.term} \u2014 ${v.meaning}`, sub: `T\u1EEB v\u1EF1ng ${l.name}`, kind: "lang", id: l.code });
      });
    });
    TOOLS.forEach((t) => {
      if (norm(t.title + " " + t.sub).includes(n)) hits.push({ group: "Ti\u1EC7n \xEDch", icon: t.emoji, title: t.title, sub: t.sub, kind: "tool", id: t.id });
    });
    state.posts.forEach((p) => {
      if (norm(p.text + " " + p.author).includes(n)) hits.push({ group: "C\u1ED9ng \u0111\u1ED3ng", icon: "\u{1F4AC}", title: p.text.slice(0, 70), sub: p.author, kind: "post", id: p.id });
    });
    return hits.slice(0, 20);
  }
  function renderSearch(q) {
    const panel = $("#search-panel");
    if (!panel) return;
    const hits = search(q);
    if (norm(q).length < 2) {
      panel.classList.add("hidden");
      return;
    }
    panel.classList.remove("hidden");
    if (!hits.length) {
      panel.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">Kh\xF4ng c\xF3 k\u1EBFt qu\u1EA3 cho \u201C${esc(q)}\u201D.</p>`;
      return;
    }
    let last = "";
    panel.innerHTML = hits.map((h) => {
      const head = h.group !== last ? `<p class="px-4 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-sky-700">${h.group}</p>` : "";
      last = h.group;
      return `${head}<button data-action="open-result" data-kind="${h.kind}" data-id="${esc(h.id)}" class="w-full text-left flex items-center gap-3 px-4 py-2 hover:bg-sky-50">
      <span class="text-xl">${h.icon}</span><span class="min-w-0"><span class="block text-xs font-bold text-slate-800 truncate">${esc(h.title)}</span><span class="block text-[10px] text-slate-500 truncate">${esc(h.sub)}</span></span></button>`;
    }).join("");
  }
  function renderTab(tab) {
    switch (tab) {
      case "home":
        renderHome();
        break;
      case "learn":
        renderLearn();
        break;
      case "shop":
        renderShop();
        break;
      case "entertainment":
        renderEntertainment();
        break;
      case "tasks":
        renderTasks();
        break;
      case "utilities":
        renderUtilities();
        break;
      case "community":
        renderCommunity();
        break;
      case "wallet":
        renderWallet();
        break;
    }
  }
  function showTab(tab) {
    TABS.forEach((t) => $(`#tab-${t}`)?.classList.toggle("hidden", t !== tab));
  }

  // src/modals.ts
  var btnPrimary = "px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white keep-white";
  var btnGhost = "px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50";
  var field = "w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400";
  function vocabModal() {
    const f = ui.flash;
    if (!f) return "";
    const lang = langByCode(f.lang);
    if (f.done) {
      const known = (state.known[lang.code] ?? []).length;
      return `${modalHead("\u{1F4D6} T\u1EEB v\u1EF1ng " + lang.name)}
    <div class="p-6 text-center space-y-3">
      <div class="text-5xl">\u{1F389}</div>
      <p class="font-extrabold text-slate-800">Ho\xE0n th\xE0nh l\u01B0\u1EE3t \xF4n!</p>
      <p class="text-sm text-slate-600">B\u1EA1n \u0111\xE1nh d\u1EA5u thu\u1ED9c th\xEAm <b>${f.knownNow}</b> t\u1EEB. T\u1ED5ng \u0111\xE3 thu\u1ED9c: <b>${known}/${lang.vocab.length}</b>.</p>
      <div class="flex gap-2 justify-center pt-2"><button data-action="vocab-restart" class="${btnGhost}">\xD4n l\u1EA1i</button><button data-action="close-modal" class="${btnPrimary}">Xong</button></div>
    </div>`;
    }
    const v = lang.vocab[f.order[f.pos]];
    const knownNow = (state.known[lang.code] ?? []).includes(v.term);
    return `${modalHead(`\u{1F4D6} T\u1EEB v\u1EF1ng ${lang.name} (${f.pos + 1}/${f.order.length})`)}
  <div class="p-5 space-y-4">
    <div class="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div class="h-full bg-sky-500" style="width:${f.pos / f.order.length * 100}%"></div></div>
    <button data-action="flip-card" class="card-flip block w-full h-56 text-left" aria-label="L\u1EADt th\u1EBB">
      <div class="card-face relative w-full h-full ${f.flipped ? "flipped" : ""}">
        <div class="card-front absolute inset-0 rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white keep-white flex flex-col items-center justify-center p-4 text-center">
          <p class="text-4xl font-black break-words">${esc(v.term)}</p>
          <p class="text-sm opacity-90 mt-2">${esc(v.reading)}</p>
          <p class="text-[11px] opacity-70 mt-5">Ch\u1EA1m \u0111\u1EC3 xem ngh\u0129a</p>
          ${knownNow ? '<span class="absolute top-3 right-3 text-[10px] bg-white/25 px-2 py-0.5 rounded-full">\u2713 \u0110\xE3 thu\u1ED9c</span>' : ""}
        </div>
        <div class="card-back absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white keep-white flex flex-col items-center justify-center p-5 text-center">
          <p class="text-2xl font-extrabold">${esc(v.meaning)}</p>
          <p class="text-sm mt-3 break-words">${esc(v.example)}</p>
          <p class="text-xs opacity-80 mt-1">${esc(v.exampleVi)}</p>
        </div>
      </div>
    </button>
    <div class="grid grid-cols-2 gap-3">
      <button data-action="vocab-answer" data-known="0" class="${btnGhost}">Ch\u01B0a thu\u1ED9c</button>
      <button data-action="vocab-answer" data-known="1" class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white keep-white">\u0110\xE3 thu\u1ED9c</button>
    </div>
  </div>`;
  }
  function grammarModal() {
    const lang = langByCode(state.lang ?? "en");
    if (!dailyReady(lang)) {
      enrichDaily(lang);
      return `${modalHead("\u270D\uFE0F Ng\u1EEF ph\xE1p " + lang.name)}<div class="p-5 text-center text-sm font-bold text-slate-500">\u0110ang t\u1EA3i b\xE0i h\u1ECDc\u2026</div>`;
    }
    return `${modalHead("\u270D\uFE0F Ng\u1EEF ph\xE1p " + lang.name)}
  <div class="p-5 space-y-3">
    ${dailyLesson(lang).grammar.map((gi, i) => {
      const g = lang.grammar[gi];
      const done = state.daily.lessons.includes(`grammar:${lang.code}:${i}`);
      return `<div class="rounded-2xl border border-slate-200 p-4 space-y-1.5">
        <p class="font-extrabold text-sm text-indigo-700">${i + 1}. ${esc(g.title)}</p>
        <p class="text-xs font-mono bg-slate-100 rounded-lg px-2 py-1 text-slate-700 break-words">${esc(g.pattern)}</p>
        <p class="text-xs text-slate-600">${esc(g.explain)}</p>
        <p class="text-sm font-semibold text-slate-800 break-words">${esc(g.example)}</p>
        <p class="text-xs text-slate-500">${esc(g.exampleVi)}</p>
        <button data-action="grammar-done" data-i="${i}" ${done ? "disabled" : ""} class="mt-1 px-3 py-1 rounded-lg text-[11px] font-bold ${done ? "bg-slate-200 text-slate-500" : "bg-indigo-600 text-white keep-white hover:bg-indigo-700"}">${done ? "\u2713 \u0110\xE3 hi\u1EC3u h\xF4m nay" : "\u0110\xE3 hi\u1EC3u"}</button>
      </div>`;
    }).join("")}
  </div>`;
  }
  function dialogModal() {
    const d = ui.dialog;
    if (!d) return "";
    const lang = langByCode(d.lang);
    if (d.done) {
      return `${modalHead("\u{1F3AF} Luy\u1EC7n giao ti\u1EBFp " + lang.name)}
    <div class="p-6 text-center space-y-3">
      <div class="text-5xl">${d.good === lang.dialogs.length ? "\u{1F3C6}" : "\u{1F44D}"}</div>
      <p class="font-extrabold text-slate-800">B\u1EA1n tr\u1EA3 l\u1EDDi \u0111\xFAng ngay l\u1EA7n \u0111\u1EA7u ${d.good}/${lang.dialogs.length} t\xECnh hu\u1ED1ng</p>
      <div class="flex gap-2 justify-center pt-2"><button data-action="dialog-restart" class="${btnGhost}">Luy\u1EC7n l\u1EA1i</button><button data-action="close-modal" class="${btnPrimary}">Xong</button></div>
    </div>`;
    }
    const scene = lang.dialogs[d.idx];
    const answered = d.picked !== null;
    return `${modalHead(`\u{1F3AF} ${lang.name} (${d.idx + 1}/${lang.dialogs.length})`)}
  <div class="p-5 space-y-4">
    <p class="text-[11px] font-bold uppercase tracking-wider text-sky-700">${esc(scene.scene)}</p>
    <div class="rounded-2xl bg-sky-50/60 border border-sky-200 p-4"><p class="text-lg font-extrabold text-slate-800 break-words">${esc(scene.line)}</p><p class="text-xs text-slate-500 mt-1">${esc(scene.lineVi)}</p></div>
    <p class="text-xs font-bold text-slate-600">Ch\u1ECDn c\xE2u tr\u1EA3 l\u1EDDi ph\xF9 h\u1EE3p:</p>
    <div class="space-y-2">
      ${d.order.map((oi, pos) => {
      const o = scene.options[oi];
      let cls = "bg-white border-slate-200 hover:border-sky-400";
      if (answered) {
        if (o.correct) cls = "bg-emerald-50 border-emerald-400 text-emerald-800";
        else if (d.picked === pos) cls = "bg-rose-50 border-rose-400 text-rose-800";
        else cls = "bg-white border-slate-200 opacity-60";
      }
      return `<button data-action="dialog-pick" data-pos="${pos}" ${answered ? "disabled" : ""} class="w-full text-left px-4 py-2.5 rounded-xl border text-sm font-semibold ${cls}">${esc(o.text)}</button>`;
    }).join("")}
    </div>
    ${answered ? `<div class="flex justify-end"><button data-action="dialog-next" class="${btnPrimary}">${d.idx + 1 >= lang.dialogs.length ? "Ho\xE0n th\xE0nh" : "T\xECnh hu\u1ED1ng ti\u1EBFp"}</button></div>` : ""}
  </div>`;
  }
  function certModal(certId) {
    const lang = langByCode(state.lang ?? "en");
    const c = lang.certs.find((x) => x.id === certId) ?? lang.certs[0];
    const t = tone(c.tone);
    return `${modalHead(c.name)}
  <div class="p-5 space-y-4">
    <div class="rounded-2xl bg-gradient-to-br ${t.card} border p-4"><p class="font-extrabold ${t.title}">${esc(c.name)} \u2022 ${esc(c.sub)}</p><p class="text-xs ${t.sub} mt-1">${esc(c.desc)}</p></div>
    <div><p class="text-xs font-bold text-slate-700 mb-1">C\u1EA5u tr\xFAc b\xE0i thi</p><ul class="list-disc pl-5 text-xs text-slate-600 space-y-0.5">${c.structure.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
    <p class="text-xs text-slate-600"><b>C\u1EA5p \u0111\u1ED9 / thang \u0111i\u1EC3m:</b> ${esc(c.levels)}</p>
    <div class="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-900">\u0110\u1EC1 th\u1EED g\u1ED3m 7 c\xE2u (t\u1EEB v\u1EF1ng v\xE0 ng\u1EEF ph\xE1p). L\xE0m \u0111\u1EC1 \u0111\u1EC3 t\u1EF1 \u0111\xE1nh gi\xE1 tr\xECnh \u0111\u1ED9 c\u1EE7a b\u1EA1n.</div>
    <button data-action="start-cert-quiz" data-id="${c.id}" class="w-full ${btnPrimary}">Gi\u1EA3i \u0111\u1EC1 th\u1EED 7 c\xE2u</button>
  </div>`;
  }
  function quizModal() {
    const q = ui.quiz;
    if (!q) return "";
    if (q.finished) {
      const won = q.kind === "game" && q.streak >= q.target;
      const again = `<button data-action="quiz-again" class="${btnGhost}">${q.kind === "game" ? "Ch\u01A1i l\u1EA1i" : "L\xE0m l\u1EA1i"}</button>`;
      const change = q.kind === "game" ? `<button data-action="change-game-lang" class="${btnGhost}">\u0110\u1ED5i ng\xF4n ng\u1EEF</button>` : "";
      return `${modalHead(q.title)}
    <div class="p-6 text-center space-y-3">
      <div class="text-5xl">${won ? "\u{1F3C6}" : q.correct >= q.questions.length * 0.7 ? "\u{1F389}" : "\u{1F4AA}"}</div>
      ${q.kind === "game" ? `<p class="font-extrabold text-slate-800">${won ? "Chu\u1ED7i 10 c\xE2u \u0111\xFAng!" : "K\u1EBFt th\xFAc v\xE1n ch\u01A1i"}</p><p class="text-sm text-slate-600">${won ? `B\u1EA1n \u0111\xE3 ho\xE0n th\xE0nh nhi\u1EC7m v\u1EE5 <b>Th\u1EAFng \u0111\u1ED1 vui</b>. V\xE0o Ti\u1EC7n \xEDch &gt; Nhi\u1EC7m v\u1EE5 \u0111\u1EC3 nh\u1EADn <b>${fmt(GAME_REWARD)} Xu</b>.` : `Chu\u1ED7i hi\u1EC7n t\u1EA1i ${q.streak}/${q.target}.`}</p>` : `<p class="font-extrabold text-slate-800">\u0110\xFAng ${q.correct}/${q.questions.length} c\xE2u</p><p class="text-sm text-slate-600">H\xE3y luy\u1EC7n t\u1EADp th\xEAm \u0111\u1EC3 nh\u1EDB l\xE2u h\u01A1n nh\xE9.</p>`}
      <div class="flex flex-wrap gap-2 justify-center pt-2">${again}${change}<button data-action="close-modal" class="${btnPrimary}">Xong</button></div>
    </div>`;
    }
    const cur = q.questions[q.idx];
    const answered = q.picked !== null;
    const status = q.kind === "game" ? `Chu\u1ED7i \u0111\xFAng: ${q.streak}/${q.target}` : `C\xE2u ${q.idx + 1}/${q.questions.length}`;
    const pct = q.kind === "game" ? q.streak / q.target * 100 : q.idx / q.questions.length * 100;
    const last = q.kind !== "game" && q.idx + 1 >= q.questions.length;
    let promptBox;
    if (cur.speak) {
      promptBox = `<div class="rounded-2xl bg-sky-50/60 border border-sky-200 p-4 text-center space-y-2">
      <p class="text-[11px] text-slate-500">${esc(cur.sub)}</p>
      <button data-action="quiz-speak" class="w-16 h-16 rounded-full bg-sky-600 hover:bg-sky-700 text-white keep-white text-2xl shadow-md" aria-label="Ph\xE1t \xE2m thanh">\u{1F50A}</button>
      ${speechSupported() ? '<p class="text-[10px] text-slate-400">B\u1EA5m \u0111\u1EC3 nghe l\u1EA1i</p>' : `<p class="text-sm font-bold text-slate-700">${esc(cur.speak)}</p><p class="text-[10px] text-slate-400">Tr\xECnh duy\u1EC7t kh\xF4ng h\u1ED7 tr\u1EE3 \u0111\u1ECDc, h\xE3y d\xF9ng ch\u1EEF \u1EDF tr\xEAn.</p>`}
    </div>`;
    } else {
      promptBox = `<div class="rounded-2xl bg-sky-50/60 border border-sky-200 p-4 text-center"><p class="text-[11px] text-slate-500">${esc(cur.sub)}</p><p class="${cur.prompt.length > 40 ? "text-lg" : "text-2xl"} font-black text-slate-800 break-words mt-1">${esc(cur.prompt)}</p></div>`;
    }
    let body;
    if (cur.write) {
      body = `<div class="space-y-2">
      <input id="qz-write" data-autofocus type="text" autocomplete="off" autocapitalize="off" spellcheck="false" ${answered ? "disabled" : ""} value="${esc(q.wrote)}" placeholder="G\xF5 \u0111\xE1p \xE1n c\u1EE7a b\u1EA1n..." class="${field} ${answered ? q.wroteOk ? "border-emerald-400 bg-emerald-50" : "border-rose-400 bg-rose-50" : ""}">
      ${cur.hint && !answered ? `<p class="text-[11px] text-slate-500">${esc(cur.hint)}</p>` : ""}
      ${answered ? `<p class="text-xs font-bold ${q.wroteOk ? "text-emerald-700" : "text-rose-600"}">${q.wroteOk ? "Ch\xEDnh x\xE1c!" : `Ch\u01B0a \u0111\xFAng. \u0110\xE1p \xE1n: ${esc(cur.write[0])}${cur.write[1] ? ` (${esc(cur.write[1])})` : ""}`}</p>` : `<button data-action="quiz-write" class="w-full ${btnPrimary}">Ki\u1EC3m tra</button>`}
    </div>`;
    } else {
      body = `<div class="grid grid-cols-1 gap-2">
      ${cur.options.map((o, i) => {
        let cls = "bg-white border-slate-200 hover:border-sky-400";
        if (answered) {
          if (i === cur.answer) cls = "bg-emerald-50 border-emerald-400 text-emerald-800";
          else if (i === q.picked) cls = "bg-rose-50 border-rose-400 text-rose-800";
          else cls = "bg-white border-slate-200 opacity-60";
        }
        return `<button data-action="quiz-pick" data-i="${i}" ${answered ? "disabled" : ""} class="w-full text-left px-4 py-2.5 rounded-xl border text-sm font-semibold ${cls}">${esc(o)}</button>`;
      }).join("")}
    </div>`;
    }
    return `${modalHead(q.title)}
  <div class="p-5 space-y-4">
    <div class="flex items-center justify-between text-xs font-bold text-slate-600"><span>${status}</span>${q.kind === "game" ? '<span class="text-purple-600">Nhi\u1EC7m v\u1EE5: ' + fmt(GAME_REWARD) + " Xu</span>" : ""}</div>
    <div class="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div class="h-full ${q.kind === "game" ? "bg-purple-500" : "bg-sky-500"}" style="width:${pct}%"></div></div>
    ${promptBox}
    ${body}
    ${answered ? `<div class="flex justify-end"><button data-action="quiz-next" class="${btnPrimary}">${last ? "Xem k\u1EBFt qu\u1EA3" : q.kind === "game" && q.streak >= q.target ? "Nh\u1EADn th\u01B0\u1EDFng" : "C\xE2u ti\u1EBFp theo"}</button></div>` : ""}
  </div>`;
  }
  function practiceModal() {
    const lang = langByCode(state.lang ?? "en");
    const card = (action, mode, icon, title, sub) => `<button data-action="${action}" ${mode ? `data-mode="${mode}"` : ""} class="text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-sky-400 hover:shadow-md transition-all">
      <div class="text-2xl mb-1">${icon}</div><p class="text-sm font-extrabold text-slate-800">${title}</p><p class="text-[11px] text-slate-500 mt-0.5">${sub}</p></button>`;
    return `${modalHead(`\u{1F3AF} Luy\u1EC7n t\u1EADp ${lang.name} ${lang.flag}`)}
  <div class="p-5 space-y-3">
    <p class="text-xs text-slate-600">Ch\u1ECDn k\u1EF9 n\u0103ng mu\u1ED1n luy\u1EC7n. M\u1ED7i b\xE0i g\u1ED3m 5 c\xE2u.</p>
    <div class="grid grid-cols-2 gap-3">
      ${card("start-practice", "listen", "\u{1F3A7}", "Nghe", "Nghe ph\xE1t \xE2m r\u1ED3i ch\u1ECDn ngh\u0129a \u0111\xFAng")}
      ${card("start-practice", "read", "\u{1F440}", "\u0110\u1ECDc", "\u0110\u1ECDc c\xE2u v\xE0 ch\u1ECDn b\u1EA3n d\u1ECBch \u0111\xFAng")}
      ${card("start-practice", "write", "\u270D\uFE0F", "Vi\u1EBFt", "Nh\xECn ngh\u0129a ti\u1EBFng Vi\u1EC7t, g\xF5 t\u1EEB t\u01B0\u01A1ng \u1EE9ng")}
      ${card("open-dialog", "", "\u{1F4AC}", "H\u1ED9i tho\u1EA1i", `${lang.dialogs.length} t\xECnh hu\u1ED1ng giao ti\u1EBFp`)}
    </div>
  </div>`;
  }
  function gamePickModal() {
    return `${modalHead("\u{1F3AF} Ch\u1ECDn ng\xF4n ng\u1EEF \u0111\u1EC3 ch\u01A1i")}
  <div class="p-5 space-y-3">
    <p class="text-xs text-slate-600">C\xE2u h\u1ECFi s\u1EBD l\u1EA5y t\u1EEB v\u1EF1ng c\u1EE7a ng\xF4n ng\u1EEF b\u1EA1n ch\u1ECDn. Th\u1EAFng v\xE1n (\u0111\xFAng 10 c\xE2u li\xEAn ti\u1EBFp) \u0111\u1EC3 ho\xE0n th\xE0nh nhi\u1EC7m v\u1EE5 nh\u1EADn <b class="text-purple-600">5,000 Xu</b>.</p>
    <div class="grid grid-cols-2 gap-2.5">
      ${LANGUAGES.map((l, i) => `<button data-action="game-lang" data-code="${l.code}" class="px-3 py-3 rounded-2xl border border-slate-200 bg-white hover:border-purple-400 hover:shadow-sm font-bold text-xs flex items-center gap-2 ${i === LANGUAGES.length - 1 ? "col-span-2 justify-center" : ""}"><span class="text-2xl">${l.flag}</span><span>${l.name}</span></button>`).join("")}
    </div>
    
  </div>`;
  }
  function cartModal() {
    const cur = state.settings.currency;
    const rows = Object.entries(state.cart).map(([id, qty]) => ({ p: PRODUCTS.find((x) => x.id === id), qty })).filter((r) => r.p);
    const total = cartTotal();
    return `${modalHead("\u{1F9FA} Gi\u1ECF h\xE0ng")}
  <div class="p-5 flex-1 space-y-3">
    ${rows.length ? rows.map(({ p, qty }) => `
    <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
      <div class="text-3xl">${esc(p.emoji)}</div>
      <div class="flex-1 min-w-0"><p class="text-xs font-bold text-slate-800 truncate">${esc(p.name)}</p><p class="text-[11px] font-black text-sky-700">${money(p.price[cur], cur)}</p></div>
      <div class="flex items-center gap-1.5">
        <button data-action="cart-dec" data-id="${p.id}" class="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold" aria-label="Gi\u1EA3m">\u2212</button>
        <span class="text-xs font-bold w-5 text-center">${qty}</span>
        <button data-action="cart-inc" data-id="${p.id}" class="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold" aria-label="T\u0103ng">+</button>
      </div>
    </div>`).join("") : '<p class="text-sm text-slate-500 text-center py-10">Gi\u1ECF h\xE0ng \u0111ang tr\u1ED1ng.</p>'}
  </div>
  ${rows.length ? `<div class="p-5 border-t border-slate-100 space-y-3 sticky bottom-0 bg-white">
    <div class="flex justify-between text-sm"><span class="text-slate-600">T\u1EA1m t\xEDnh (${CURRENCIES[cur].name})</span><span class="font-black text-sky-700">${money(total, cur)}</span></div>
    <div class="flex gap-2"><button data-action="cart-clear" class="${btnGhost}">X\xF3a gi\u1ECF</button>
    <button data-action="checkout" class="flex-1 ${btnPrimary}">Thanh to\xE1n ${money(total, cur)}</button></div>
  </div>` : ""}`;
  }
  function payModal() {
    const cur = state.settings.currency;
    const total = cartTotal();
    return `${modalHead("\u{1F4B3} Thanh to\xE1n \u0111\u01A1n h\xE0ng")}
  <div class="p-5 space-y-4">
    <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-1">
      <p class="text-[11px] text-slate-500">${cartCount()} s\u1EA3n ph\u1EA9m \u2022 ${CURRENCIES[cur].flag} ${CURRENCIES[cur].name}</p>
      <p class="text-2xl font-black text-slate-800">${money(total, cur)}</p>
    </div>
    <div><label class="text-xs font-bold text-slate-600" for="pay-method">Ph\u01B0\u01A1ng th\u1EE9c thanh to\xE1n</label>
      <select id="pay-method" class="${field} mt-1">${CURRENCIES[cur].methods.map((m) => `<option>${m}</option>`).join("")}</select></div>
    ${bankBox(cur, payCode("payCode"))}
    <p class="text-[11px] text-slate-500">Xu kh\xF4ng th\u1EC3 d\xF9ng \u0111\u1EC3 thanh to\xE1n s\u1EA3n ph\u1EA9m WIND Store. Ch\u1EC9 b\u1EA5m "X\xE1c nh\u1EADn thanh to\xE1n" <b>sau khi \u0111\xE3 chuy\u1EC3n kho\u1EA3n xong</b>; \u0111\u01A1n s\u1EBD hi\u1EC7n "Ch\u1EDD x\u1EED l\xFD" cho \u0111\u1EBFn khi \u0111\u01B0\u1EE3c x\xE1c minh.</p>
    <div class="flex gap-2"><button data-action="open-cart" class="${btnGhost}">Quay l\u1EA1i</button><button data-action="pay-order" class="flex-1 ${btnPrimary}">X\xE1c nh\u1EADn thanh to\xE1n</button></div>
  </div>`;
  }
  var FB_PAGE = "https://www.facebook.com/profile.php?id=61590914339438";
  function payCode(k) { if (!ui[k]) ui[k] = newOrderCode(k === "topupCode" ? ((ui.topup && (ui.topup.src === "game" || ui.topup.src === "chip")) ? "game" : "topup") : "store"); return ui[k]; }
  function bankBox(cur, code) {
    cur = cur || state.settings.currency;
    const acc = cur === "VND" ? { bank: "Techcombank", num: "19072080970015" } : cur === "KRW" ? { bank: "Toss Bank (토스뱅크)", num: "1002-7308-5584" } : null;
    const body = acc
      ? `<p class="text-xs text-slate-700">Ngân hàng: <b>${acc.bank}</b></p>
      <p class="text-xs text-slate-700 flex items-center gap-2 flex-wrap">Số tài khoản: <b class="text-sm tracking-wide">${acc.num}</b><button data-action="copy-acc" data-text="${acc.num}" class="px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-[10px] font-bold text-amber-800">Sao chép</button></p>
      <p class="text-xs text-slate-700">Chủ tài khoản: <b>LE THANH PHONG</b></p>`
      : `<p class="text-xs text-slate-700">Tài khoản nhận tiền tại Nhật Bản: <b>sẽ được cập nhật sau</b>.</p>`;
    const memo = code ? `<p class="text-xs text-slate-700 flex items-center gap-2 flex-wrap">Nội dung chuyển khoản (mã đơn): <b class="text-sm tracking-wide">${code}</b><button data-action="copy-acc" data-text="${code}" class="px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-[10px] font-bold text-amber-800">Sao chép</button></p>` : "";
    return `<div class="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-1.5">
      <p class="text-[11px] font-extrabold text-amber-800 uppercase tracking-wide">🏦 Thông tin chuyển khoản · ${CURRENCIES[cur].flag} ${CURRENCIES[cur].name}</p>
      ${body}
      ${memo}
      <p class="text-[11px] text-rose-600 font-bold pt-1">⚠️ Trước khi chuyển khoản, hãy kiểm tra đúng tên chủ tài khoản và liên hệ trang Facebook để được hỗ trợ xác minh.</p>
      <div class="flex gap-2 flex-wrap pt-1"><button data-action="open-fb" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white keep-white text-[11px] font-bold">💬 Liên hệ trang Facebook</button><button data-action="copy-acc" data-text="${FB_PAGE}" class="px-3 py-1.5 rounded-lg bg-white border border-blue-300 text-blue-700 text-[11px] font-bold">Sao chép link</button></div>
    </div>`;
  }
  var TOPUP_AMOUNTS = [5e4, 1e5, 2e5, 5e5, 1e6];
  var TOPUP_RATE = { VND: 1, KRW: 19, JPY: 160 };
  var MINPAY = { VND: 30000, KRW: 2000, JPY: 200 };
  var BIG_THR = { VND: 1000000, KRW: 52600, JPY: 6250 };
  var CHIP_LIM = { minorDaily: 1e5, adultDaily: 5e6 }; // hạn mức đổi Xu → chip mỗi ngày (một nguồn duy nhất, game đọc qua WINDTP.chipLimit)
  var TOPUP_PRESETS = { VND: [3e4, 5e4, 1e5, 2e5, 5e5, 1e6], KRW: [2e3, 5e3, 1e4, 2e4, 5e4, 1e5], JPY: [200, 500, 1e3, 2e3, 5e3, 1e4] };
  function topupTitle() { return topupState().src === "chip" ? "🎰 Mua chip trong game" : topupState().src === "game" ? "🪙 Mua xu trong game" : "🪙 Nạp WIND Coin"; }
  function topupXu(cur, amt) { return Math.round(Number(amt) * TOPUP_RATE[cur]); }
  /* v41: đổi tiền tệ giữ nguyên mức đã chọn (cùng bậc) hoặc quy đổi theo giá trị với số nhập tay */
  function convertTopupAmt(from, to, amt) {
    amt = Number(amt) || 0;
    if (from === to) return amt;
    const i = TOPUP_PRESETS[from].indexOf(amt);
    if (i >= 0) return TOPUP_PRESETS[to][i];
    return Math.max(MINPAY[to], Math.round(amt * TOPUP_RATE[from] / TOPUP_RATE[to]));
  }
  function todayIso() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function ageFromBirth(b) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b || ""); if (!m) return -1; const y = +m[1], mo = +m[2], d = +m[3], n = new Date(), t = new Date(y, mo - 1, d); if (t.getFullYear() !== y || t.getMonth() !== mo - 1 || t.getDate() !== d || t > n) return -1; let a = n.getFullYear() - y; if (n.getMonth() + 1 < mo || (n.getMonth() + 1 === mo && n.getDate() < d)) a--; return a; }
  function ageDateAt(b, n) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b || ""); if (!m) return ""; const d = new Date(+m[1] + n, +m[2] - 1, +m[3]); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
  function ageGroupBox(b) {
    const a = ageFromBirth(b); if (a < 0) return "";
    const box = (bg, bd, title, body) => `<div style="border-radius:12px;padding:8px 10px;background:${bg};border:1px solid ${bd};line-height:1.45;color:#1f2937"><p style="font-weight:800;margin:0 0 2px;color:#111827">${title}</p><p style="margin:0;color:#1f2937">${body}</p></div>`;
    if (a < 12) return box("#fef2f2", "#fecaca", "🔒 Dưới 12 tuổi · " + a + " tuổi", "Chưa chơi được game đánh bài (Tiến lên, Phỏm, Ba cây, Liêng, Poker) và không mua chip. Vẫn chơi Cờ vua, Cờ tướng, Quay may mắn. Game bài mở khóa từ <b>" + ageDateAt(b, 12) + "</b>.");
    if (a < 18) return box("#fffbeb", "#fde68a", "⏳ 12–17 tuổi · " + a + " tuổi", "Chơi game bài tối đa <b>180 phút/ngày</b>, nhắc nghỉ sau 60 phút liên tục, <b>không mua chip bằng tiền</b> (đổi WIND Coin tối đa 100.000 chip/ngày). Mua chip bằng tiền từ <b>" + ageDateAt(b, 18) + "</b>.");
    return box("#ecfdf5", "#a7f3d0", "✅ Từ 18 tuổi · " + a + " tuổi", "Chơi đầy đủ game bài và mua chip bằng tiền (đổi WIND Coin tối đa 5.000.000 chip/ngày). Chip chỉ để giải trí, không đổi thưởng.");
  }
  function topupState() { if (!ui.topup) ui.topup = { cur: state.settings.currency, amt: TOPUP_PRESETS[state.settings.currency][1], step: 1 }; return ui.topup; }
  function topupModal() {
    const t = topupState(), cur = t.cur, xu = topupXu(cur, t.amt), U = t.src === "chip" ? "chip" : "Xu";
    if (t.step === 2) {
      const code = payCode("topupCode");
      return `${modalHead("\u{1FA99} Thanh to\xE1n n\u1EA1p Xu")}
  <div class="p-5 space-y-4">
    <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-1">
      <p class="text-[11px] text-slate-500">${CURRENCIES[cur].flag} ${CURRENCIES[cur].name}</p>
      <p class="text-2xl font-black text-slate-800">${money(t.amt, cur)}</p>
      <p class="text-sm font-bold text-amber-700">\u2192 ${fmt(xu)} Xu</p>
    </div>
    ${bankBox(cur, code)}
    <p class="text-[11px] text-slate-500">Ch\u1EC9 b\u1EA5m "X\xE1c nh\u1EADn thanh to\xE1n" <b>sau khi \u0111\xE3 chuy\u1EC3n kho\u1EA3n xong</b>. Xu s\u1EBD \u0111\u01B0\u1EE3c c\u1ED9ng sau khi \u0111\u01B0\u1EE3c x\xE1c minh.</p>
    <div class="flex gap-2"><button data-action="topup-back" class="${btnGhost}">Quay l\u1EA1i</button><button data-action="submit-topup" class="flex-1 ${btnPrimary}">X\xE1c nh\u1EADn thanh to\xE1n</button></div>
  </div>`;
    }
    const presets = TOPUP_PRESETS[cur];
    return `${modalHead("\u{1FA99} N\u1EA1p Xu")}
  <div class="p-5 space-y-4">
    <div><p class="text-xs font-bold text-slate-600 mb-1.5">1. Ch\u1ECDn lo\u1EA1i ti\u1EC1n</p>
      <div class="grid grid-cols-3 gap-2">${["VND", "KRW", "JPY"].map((c) => `<button data-action="topup-cur" data-cur="${c}" class="py-2 rounded-xl border text-xs font-bold ${c === cur ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700"}">${CURRENCIES[c].flag} ${c}</button>`).join("")}</div></div>
    <div><p class="text-xs font-bold text-slate-600 mb-1.5">2. Ch\u1ECDn s\u1ED1 ti\u1EC1n</p>
      <div class="grid grid-cols-3 gap-2">${presets.map((a) => `<button data-action="topup-amt" data-amt="${a}" class="py-2.5 rounded-xl border text-xs font-bold ${Number(t.amt) === a ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700"}">${money(a, cur)}</button>`).join("")}</div>
      <label class="text-[11px] text-slate-500 mt-2 block" for="topup-custom">Ho\u1EB7c nh\u1EADp s\u1ED1 kh\xE1c (${CURRENCIES[cur].symbol})</label>
      <input id="topup-custom" data-change="topup-custom" type="number" min="1" step="1" value="${presets.includes(Number(t.amt)) ? "" : esc(String(t.amt))}" placeholder="V\xED d\u1EE5 ${presets[1]}" class="${field} mt-1"></div>
    <div class="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
      <p class="text-[11px] text-slate-500">Quy \u0111\u1ED5i: 1 ${CURRENCIES[cur].symbol} = ${TOPUP_RATE[cur]} Xu</p>
      <p class="text-xl font-black text-amber-700">${money(t.amt || 0, cur)} \u2192 ${fmt(xu)} Xu</p>
    </div>
    <button data-action="topup-next" class="w-full ${btnPrimary}">Ti\u1EBFp t\u1EE5c \u0111\u1EBFn thanh to\xE1n</button>
  </div>`;
  }

