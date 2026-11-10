  /* ===== v5: product detail, unified payment, Facebook contact ===== */
  function fbContactBtn() {
    return `<span class="fbc"><small>Liên hệ</small><span class="flex gap-2 items-center"><button data-action="open-fb" class="fbc-btn">Facebook WINDTP</button><button data-action="copy-acc" data-text="${FB_PAGE}" class="px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-[11px] font-bold">Sao chép link</button></span></span>`;
  }
  function curChips(cur, kind) {
    return `<div class="grid grid-cols-3 gap-2">${["VND", "KRW", "JPY"].map((c) => `<button data-action="pay-cur" data-kind="${kind}" data-cur="${c}" class="py-2 rounded-xl border text-xs font-bold ${c === cur ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 text-slate-700"}">${CURRENCIES[c].flag} ${c}</button>`).join("")}</div>`;
  }
  function bankBox(cur, code) {
    cur = cur || state.settings.currency;
    const acc = cur === "VND" ? { bank: "Techcombank", num: "19072080970015" } : cur === "KRW" ? { bank: "Toss Bank (토스뱅크)", num: "1002-7308-5584" } : null;
    const cp = (t) => `<button data-action="copy-acc" data-text="${t}" class="px-2 py-0.5 rounded-lg bg-white border border-sky-300 text-[10px] font-bold text-sky-800">Sao chép</button>`;
    const body = acc
      ? `<p class="text-xs text-slate-700">Ngân hàng: <b>${acc.bank}</b></p>
      <p class="text-xs text-slate-700 flex items-center gap-2 flex-wrap">Số tài khoản: <b class="text-sm tracking-wide">${acc.num}</b>${cp(acc.num)}</p>
      <p class="text-xs text-slate-700">Chủ tài khoản: <b>LE THANH PHONG</b></p>`
      : `<p class="text-xs text-slate-700">Tài khoản nhận tiền tại Nhật Bản: <b>sẽ được cập nhật sau</b>.</p>`;
    const memo = code ? `<p class="text-xs text-slate-700 flex items-center gap-2 flex-wrap">Nội dung chuyển khoản: <b class="text-sm tracking-wide">${code}</b>${cp(code)}</p>` : "";
    return `<div class="pay-box space-y-1.5">
      <p class="text-xs font-extrabold text-sky-900">🏦 Thông tin chuyển khoản · ${CURRENCIES[cur].flag} ${CURRENCIES[cur].name}</p>
      ${body}${memo}
      <p class="text-[11px] text-rose-600 font-bold pt-1">Hãy kiểm tra đúng tên chủ tài khoản trước khi chuyển khoản.</p>
      <div class="pt-1">${fbContactBtn()}</div>
    </div>`;
  }
  function payPanel(cur, kind, code) {
    return `<div><p class="text-xs font-bold text-slate-600 mb-1.5">Chọn đơn vị tiền tệ</p>${curChips(cur, kind)}</div>
    <div><label class="text-xs font-bold text-slate-600" for="pay-method">Phương thức thanh toán</label>
      <select id="pay-method" class="${field} mt-1">${CURRENCIES[cur].methods.map((m) => `<option>${m}</option>`).join("")}</select></div>
    ${bankBox(cur, code)}`;
  }
  function payModal() {
    const cur = state.settings.currency, total = cartTotal();
    return `${modalHead("💳 Thanh toán đơn hàng")}
  <div class="p-5 space-y-4">
    <div class="pay-box"><p class="text-[11px] text-slate-500">${cartCount()} sản phẩm WIND Store</p><p class="text-2xl font-black text-slate-800">${money(total, cur)}</p></div>
    ${payPanel(cur, "store", payCode("payCode"))}
    <p class="text-xs font-extrabold text-slate-900">Chỉ bấm "Xác nhận thanh toán" <b>sau khi đã chuyển khoản xong</b>. Đơn sẽ hiện "Chờ xử lý" đến khi được xác minh.</p>
    <div class="flex gap-2"><button data-action="open-cart" class="${btnGhost}">Quay lại</button><button data-action="pay-order" class="flex-1 ${btnPrimary}">Xác nhận thanh toán</button></div>
  </div>`;
  }
  function topupModal() {
    const t = topupState(), cur = t.cur, xu = topupXu(cur, t.amt), U = t.src === "chip" ? "chip" : "Xu";
    if (t.step === 2) {
      return `${modalHead(topupTitle())}
  <div class="p-5 space-y-4">
    <div class="pay-box"><p class="text-2xl font-black text-slate-800">${money(t.amt, cur)}</p><p class="text-sm font-bold text-amber-700">Nhận ${fmt(xu)} ${U}</p></div>
    ${payPanel(cur, "topup", payCode("topupCode"))}
    <p class="text-xs font-extrabold text-slate-900">Chỉ bấm "Xác nhận thanh toán" <b>sau khi đã chuyển khoản xong</b>. ${U} được cộng sau khi xác minh.</p>
    <div class="flex gap-2"><button data-action="topup-back" class="${btnGhost}">Quay lại</button><button data-action="submit-topup" class="flex-1 ${btnPrimary}">Xác nhận thanh toán</button></div>
  </div>`;
    }
    const presets = TOPUP_PRESETS[cur];
    return `${modalHead(topupTitle())}
  <div class="p-5 space-y-4">
    <div><p class="text-xs font-bold text-slate-600 mb-1.5">Chọn đơn vị tiền tệ</p>${curChips(cur, "topup")}</div>
    <div><p class="text-xs font-bold text-slate-600 mb-1.5">Chọn số tiền</p>
      <div class="grid grid-cols-3 gap-2">${presets.map((a) => `<button data-action="topup-amt" data-amt="${a}" class="py-2.5 rounded-xl border text-xs font-bold ${Number(t.amt) === a ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 text-slate-700"}">${money(a, cur)}</button>`).join("")}</div>
      <label class="text-[11px] text-slate-500 mt-2 block" for="topup-custom">Hoặc nhập số khác (${CURRENCIES[cur].symbol})</label>
      <input id="topup-custom" data-change="topup-custom" type="number" min="1" step="1" value="${presets.includes(Number(t.amt)) ? "" : esc(String(t.amt))}" placeholder="Ví dụ ${presets[1]}" class="${field} mt-1"></div>
    <div class="pay-box text-center"><p class="text-[11px] text-slate-500">Quy đổi: 1 ${CURRENCIES[cur].symbol} = ${TOPUP_RATE[cur]} ${U}</p><p class="text-xl font-black text-amber-700">${money(t.amt || 0, cur)} → ${fmt(xu)} ${U}</p></div>
    <button data-action="topup-next" class="w-full ${btnPrimary}">Tiếp tục thanh toán</button>
  </div>`;
  }
  function productModal() {
    const v = ui.prod || {}, p = PRODUCTS.find((x) => x.id === v.id);
    if (!p) return `${modalHead("Sản phẩm")}<p class="p-6 text-sm text-slate-500">Không tìm thấy sản phẩm.</p>`;
    const cur = state.settings.currency, q = v.qty || 1;
    return `${modalHead(esc(p.name))}
  <div class="p-5 space-y-4">
    <div class="rounded-2xl overflow-hidden">${productThumb(p, "w-full h-60 text-7xl")}</div>
    <div><p class="pd-price">${money(p.price[cur] * q, cur)}</p><p class="text-[11px] text-slate-500">${soldLine(p)}${meta(p).sub ? " · " + esc(meta(p).sub) : ""}</p></div>
    <p class="text-sm text-slate-700 leading-relaxed">${esc(p.desc)}</p>
    <div><p class="text-xs font-bold text-slate-600 mb-1.5">Chọn đơn vị tiền tệ</p>${curChips(cur, "product")}</div>
    <div class="flex items-center justify-between"><span class="text-xs font-bold text-slate-600">Số lượng</span>
      <span class="pd-qty"><button data-action="prod-qty" data-d="-1" aria-label="Giảm">−</button><span>${q}</span><button data-action="prod-qty" data-d="1" aria-label="Tăng">+</button></span></div>
    <div class="flex gap-2"><button data-action="prod-add" class="flex-1 ${btnGhost}">🛒 Thêm vào giỏ hàng</button><button data-action="prod-buy" class="flex-1 ${btnPrimary}">Mua ngay</button></div>
    <div class="pt-1">${fbContactBtn()}</div>
    ${isAdmin() ? `<div class="flex gap-2"><button data-action="pp-edit" data-id="${p.id}" class="flex-1 py-2 rounded-xl text-xs font-bold bg-sky-50 text-sky-700">✏️ Sửa sản phẩm (máy chủ)</button><button data-action="pp-del" data-id="${p.id}" data-from="modal" class="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600">🗑 Xóa sản phẩm (máy chủ)</button></div>` : ""}
  </div>`;
  }
  function addProdToCart() {
    const v = ui.prod; if (!v) return false;
    state.cart[v.id] = (state.cart[v.id] ?? 0) + (v.qty || 1);
    commit(); return true;
  }
  function openProduct_(id) { ui.prod = { id, qty: 1 }; openModal(productModal); }
  function pendingModal() {
    const o = ui.pendingOrder || {};
    return `${modalHead("\u23F3 Ch\u1EDD x\u1EED l\xFD")}
  <div class="p-6 text-center space-y-3">
    <div class="text-5xl">\u23F3</div>
    <p class="text-lg font-black text-amber-700">Ch\u1EDD x\u1EED l\xFD</p>
    <p class="text-sm text-slate-700">${esc(o.summary || "")}</p>
    <p class="text-xs text-slate-500">M\xE3 \u0111\u01A1n: <b>${esc(o.code || "")}</b></p>
    <p class="text-[11px] text-slate-500">Ch\xFAng t\xF4i s\u1EBD x\xE1c minh kho\u1EA3n chuy\u1EC3n kho\u1EA3n r\u1ED3i k\xEDch ho\u1EA1t \u0111\u01A1n. N\u1EBFu c\u1EA7n h\u1ED7 tr\u1EE3, h\xE3y nh\u1EAFn trang Facebook k\xE8m m\xE3 \u0111\u01A1n.</p>
    <div class="flex gap-2 justify-center items-end">${fbContactBtn()}<button data-action="close-modal" class="${btnGhost}">\u0110\xF3ng</button></div>
  </div>`;
  }
  function listingModal(l) {
    const saved = state.saved.includes(l.id);
    const mine = l.seller === state.userName;
    return `${modalHead(esc(l.title))}
  <div class="p-5 space-y-3">
    <div class="rounded-2xl overflow-hidden">${l.img ? `<div class="relative h-44 bg-sky-100 flex items-center justify-center text-6xl"><span>${l.emoji}</span><img src="${esc(l.img)}" alt="" class="absolute inset-0 w-full h-full object-cover" onerror="this.remove()"></div>` : `<div class="h-32 bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center text-6xl">${l.emoji}</div>`}</div>
    <p class="text-lg font-black text-teal-600">${esc(l.price)}</p>
    <p class="text-xs text-slate-500">${esc(l.loc)} \u2022 ${timeAgo(l.ts)} \u2022 Ng\u01B0\u1EDDi \u0111\u0103ng: <b>${esc(l.seller)}</b></p>
    <p class="text-sm text-slate-700 whitespace-pre-line break-words">${esc(l.desc)}</p>
    <div class="flex flex-wrap gap-2 pt-2">
      <button data-action="contact-seller" data-id="${l.id}" class="flex-1 ${btnPrimary}">Li\xEAn h\u1EC7 ng\u01B0\u1EDDi \u0111\u0103ng</button>
      <button data-action="save-listing" data-id="${l.id}" class="${btnGhost}">${saved ? "\u{1F516} B\u1ECF l\u01B0u" : "\u{1F516} L\u01B0u tin"}</button>
      ${mine ? `<button data-action="delete-listing" data-id="${l.id}" class="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600">G\u1EE1 tin</button>` : ""}
    </div>
  </div>`;
  }
  function postListingModal() {
    return `${modalHead("\u{1F4DD} \u0110\u0103ng tin m\u1EDBi")}
  <div class="p-5 space-y-3">
    <div><label class="text-xs font-bold text-slate-600" for="pl-cat">Danh m\u1EE5c</label>
      <select id="pl-cat" class="${field} mt-1"><option value="market">Ch\u1EE3 \u0111\u1ED3 c\u0169</option><option value="jobs">Vi\u1EC7c l\xE0m HS/SV</option><option value="housing">T\xECm &amp; nh\u01B0\u1EE3ng ph\xF2ng</option>${state.customCats.map((c) => `<option value="${c.id}" ${ui.utilCat === c.id ? "selected" : ""}>${c.emoji} ${esc(c.name)}</option>`).join("")}</select></div>
    <div><label class="text-xs font-bold text-slate-600" for="pl-title">Ti\xEAu \u0111\u1EC1 (t\u1ED1i thi\u1EC3u 5 k\xFD t\u1EF1)</label><input id="pl-title" maxlength="80" class="${field} mt-1"></div>
    <div class="grid grid-cols-2 gap-2">
      <div><label class="text-xs font-bold text-slate-600" for="pl-price">Gi\xE1 / m\u1EE9c l\u01B0\u01A1ng</label><input id="pl-price" maxlength="40" placeholder="V\xED d\u1EE5 2,000,000 VN\u0110" class="${field} mt-1"></div>
      <div><label class="text-xs font-bold text-slate-600" for="pl-loc">Khu v\u1EF1c</label><input id="pl-loc" maxlength="40" placeholder="Qu\u1EADn, th\xE0nh ph\u1ED1" class="${field} mt-1"></div>
    </div>
    <div class="grid grid-cols-2 gap-2"><div><label class="text-xs font-bold text-slate-600" for="pl-country">Quốc gia</label><input id="pl-country" maxlength="40" value="Việt Nam" placeholder="Việt Nam / Vietnam" class="${field} mt-1"></div><div><label class="text-xs font-bold text-slate-600" for="pl-region">Miền</label><div class="mt-1">${regionSelect("pl-region", "")}</div></div></div>
    <div><label class="text-xs font-bold text-slate-600" for="pl-desc">M\xF4 t\u1EA3</label><textarea id="pl-desc" rows="3" maxlength="400" class="${field} mt-1 resize-none"></textarea></div>
    <button data-action="submit-listing" class="w-full ${btnPrimary}">\u0110\u0103ng tin</button>
  </div>`;
  }
  var CATEGORY_EMOJIS = ["\u{1F4CC}", "\u{1F381}", "\u{1F4DA}", "\u{1F3B5}", "\u{1F35C}", "\u{1F697}", "\u{1F4A1}", "\u{1F43E}"];
  function moderationModal() {
    const pendingPosts = state.posts.filter((p) => p.status === "pending");
    const pendingListings = state.listings.filter((l) => l.status === "pending");
    const catLabel = (c) => { const f = UTIL_CATS.find((x) => x[0] === c); if (f) return f[1]; const cc = state.customCats.find((x) => x.id === c); return cc ? `${esc(cc.emoji)} ${esc(cc.name)}` : esc(c); };
    const meta2 = (t) => `<p class="text-[11px] text-slate-500 mt-0.5">${t}</p>`;
    const buttons = (type, id) => `<div class="flex gap-2 pt-2"><button data-action="approve-content" data-type="${type}" data-id="${id}" class="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white keep-white">✅ Duyệt và đăng</button><button data-action="reject-content" data-type="${type}" data-id="${id}" class="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-rose-100 text-rose-700">Từ chối</button></div>`;
    const postRow = (p) => `<div class="rounded-2xl p-3 border border-slate-200 bg-white"><p class="text-[10px] font-extrabold text-rose-600 uppercase">Bài cộng đồng · ${esc(p.tag)}</p><p class="text-sm font-extrabold text-slate-800 mt-1 break-words">${esc(p.author)}</p>${meta2(timeAgo(p.ts))}<div class="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-3"><p class="text-xs text-slate-800 leading-relaxed whitespace-pre-line break-words">${esc(p.text)}</p></div>${buttons("post", p.id)}</div>`;
    const listingRow = (l) => `<div class="rounded-2xl p-3 border border-slate-200 bg-white"><p class="text-[10px] font-extrabold text-rose-600 uppercase">Tin tiện ích · ${catLabel(l.cat)}</p><p class="text-sm font-extrabold text-slate-800 mt-1 break-words">${esc(l.title)}</p>${meta2(`Người đăng: <b>${esc(l.seller)}</b> • ${timeAgo(l.ts)}`)}
      ${l.img ? `<img src="${esc(l.img)}" alt="" class="mt-2 w-full max-h-48 object-cover rounded-xl">` : ""}
      <div class="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1"><p class="text-xs text-slate-800"><b>Giá / mức lương:</b> ${esc(l.price)}</p><p class="text-xs text-slate-800"><b>Khu vực:</b> ${esc(l.loc)}</p><p class="text-xs text-slate-800 whitespace-pre-line break-words"><b>Mô tả:</b> ${esc(l.desc)}</p></div>${buttons("listing", l.id)}</div>`;
    const total = pendingPosts.length + pendingListings.length;
    return `${modalHead("🛡️ Kiểm duyệt nội dung")}<div class="p-5 space-y-4"><div><h3 class="font-extrabold text-sm text-slate-800">Chờ duyệt · ${total}</h3><p class="text-[11px] text-slate-500 mt-1">Xem toàn bộ nội dung người dùng đăng rồi bấm Duyệt để hiển thị công khai.</p></div><div class="space-y-3">${pendingPosts.map(postRow).join("")}${pendingListings.map(listingRow).join("")}${total ? "" : '<p class="text-xs text-slate-500 text-center py-5">Không có nội dung chờ duyệt.</p>'}</div></div>`;
  }
  function categoryModal() {
    return `${modalHead("\uFF0B T\u1EA1o danh m\u1EE5c m\u1EDBi")}
  <div class="p-5 space-y-3">
    <p class="text-xs text-slate-600">Ngo\xE0i Ch\u1EE3 \u0111\u1ED3 c\u0169, Vi\u1EC7c l\xE0m v\xE0 Ph\xF2ng tr\u1ECD, b\u1EA1n c\xF3 th\u1EC3 t\u1EA1o danh m\u1EE5c ri\xEAng (t\u1ED1i \u0111a 8) \u0111\u1EC3 \u0111\u0103ng tin theo ch\u1EE7 \u0111\u1EC1 c\u1EE7a m\xECnh.</p>
    <div><label class="text-xs font-bold text-slate-600" for="cat-name">T\xEAn danh m\u1EE5c (2 \u0111\u1EBFn 20 k\xFD t\u1EF1)</label><input id="cat-name" data-autofocus maxlength="20" placeholder="V\xED d\u1EE5: \u0110\u1ED3 \u0103n, T\xECm b\u1EA1n \u0111i chung" class="${field} mt-1"></div>
    <div><p class="text-xs font-bold text-slate-600 mb-1">Bi\u1EC3u t\u01B0\u1EE3ng</p>
      <div class="flex flex-wrap gap-2">${CATEGORY_EMOJIS.map((e, i) => `<label class="cursor-pointer"><input type="radio" name="cat-emoji" value="${e}" class="peer sr-only" ${i === 0 ? "checked" : ""}><span class="block w-10 h-10 rounded-xl border border-slate-200 text-xl flex items-center justify-center peer-checked:border-teal-500 peer-checked:bg-teal-50">${e}</span></label>`).join("")}</div></div>
    <button data-action="submit-category" class="w-full ${btnPrimary}">T\u1EA1o danh m\u1EE5c</button>
  </div>`;
  }
  function fmtClock(sec) {
    const m = Math.floor(sec / 60);
    return `${String(m).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  }
  function pomodoroModal() {
    const p = ui.pomo;
    return `${modalHead("\u23F1 \u0110\u1ED3ng h\u1ED3 Pomodoro")}
  <div class="p-6 text-center space-y-4">
    <p class="text-xs font-bold uppercase tracking-wider ${p.mode === "focus" ? "text-rose-500" : "text-emerald-600"}">${p.mode === "focus" ? "T\u1EADp trung" : "Ngh\u1EC9 ng\u01A1i"}</p>
    <p id="pomo-time" class="text-6xl font-black text-slate-800 tabular-nums">${fmtClock(p.remaining)}</p>
    <p class="text-xs text-slate-500">Phi\xEAn \u0111\xE3 ho\xE0n th\xE0nh: <b>${p.sessions}</b></p>
    <div class="flex gap-2 justify-center">
      <button data-action="pomo-toggle" class="${btnPrimary}">${p.running ? "T\u1EA1m d\u1EEBng" : "B\u1EAFt \u0111\u1EA7u"}</button>
      <button data-action="pomo-reset" class="${btnGhost}">\u0110\u1EB7t l\u1EA1i</button>
    </div>
  </div>`;
  }
  function remindersModal() {
    const items = [...state.reminders].sort((a, b) => (a.when || "9").localeCompare(b.when || "9"));
    return `${modalHead("\u{1F5D3}\uFE0F L\u1ECBch nh\u1EAFc nh\u1EDF")}
  <div class="p-5 space-y-4">
    <div class="space-y-2">
      <input id="rm-text" maxlength="100" placeholder="Vi\u1EC7c c\u1EA7n l\xE0m, v\xED d\u1EE5: \xD4n Part 3 TOEIC" class="${field}">
      <div class="flex gap-2"><input id="rm-when" type="datetime-local" class="${field}"><button data-action="add-reminder" class="${btnPrimary} whitespace-nowrap">Th\xEAm</button></div>
    </div>
    <div class="space-y-2">
      ${items.length ? items.map((r) => `
      <div class="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
        <input type="checkbox" data-change="toggle-reminder" data-id="${r.id}" ${r.done ? "checked" : ""} class="accent-sky-600 w-4 h-4" aria-label="Ho\xE0n th\xE0nh">
        <div class="flex-1 min-w-0"><p class="text-xs font-semibold ${r.done ? "line-through text-slate-400" : "text-slate-800"} break-words">${esc(r.text)}</p>${r.when ? `<p class="text-[10px] text-slate-400">${esc(r.when.replace("T", " "))}</p>` : ""}</div>
        <button data-action="delete-reminder" data-id="${r.id}" class="text-slate-400 hover:text-rose-500 text-lg leading-none" aria-label="X\xF3a">&times;</button>
      </div>`).join("") : '<p class="text-xs text-slate-500 text-center py-4">Ch\u01B0a c\xF3 nh\u1EAFc nh\u1EDF n\xE0o.</p>'}
    </div>
  </div>`;
  }
  var gpaRows = [
    { score: "", credit: "" },
    { score: "", credit: "" },
    { score: "", credit: "" }
  ];
  var gpaResult = "";
  function setGpaResult(v) {
    gpaResult = v;
  }
  function gpaModal() {
    return `${modalHead("\u{1F9EE} T\xEDnh GPA")}
  <div class="p-5 space-y-3">
    <p class="text-xs text-slate-500">Nh\u1EADp \u0111i\u1EC3m m\xF4n (thang 10) v\xE0 s\u1ED1 t\xEDn ch\u1EC9.</p>
    ${gpaRows.map((r, i) => `<div class="grid grid-cols-2 gap-2"><input data-gpa="score" data-i="${i}" type="number" min="0" max="10" step="0.1" value="${esc(r.score)}" placeholder="\u0110i\u1EC3m m\xF4n ${i + 1}" class="${field}"><input data-gpa="credit" data-i="${i}" type="number" min="1" max="20" step="1" value="${esc(r.credit)}" placeholder="S\u1ED1 t\xEDn ch\u1EC9" class="${field}"></div>`).join("")}
    <div class="flex gap-2"><button data-action="gpa-add" class="${btnGhost}">+ Th\xEAm m\xF4n</button><button data-action="gpa-calc" class="flex-1 ${btnPrimary}">T\xEDnh GPA</button></div>
    ${gpaResult ? `<div class="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">${gpaResult}</div>` : ""}
  </div>`;
  }
  function settingsModal() {
    const s = state.settings;
    const sfxChoices = (side) => [1, 2, 3].map((n) => {
      const active = (localStorage.getItem(`windtp-sfx-${side}`) || "1") === String(n);
      const label = side === "right" ? ["Chuông nhẹ", "Ba nốt sáng", "Âm vui"] [n - 1] : ["Trầm nhẹ", "Hai âm ngắn", "Cảnh báo kép"][n - 1];
      return `<button data-action="choose-sfx" data-side="${side}" data-preset="${n}" class="rounded-xl border px-3 py-2 text-left ${active ? "border-amber-400 bg-amber-100 text-amber-900" : "border-slate-200 bg-white text-slate-700"}"><span class="block font-bold">${label}</span><span class="block text-[10px] mt-0.5">${active ? "Đang chọn · " : ""}Nghe thử</span></button>`;
    }).join("");
    const tog = (key, on, label, sub = "") => `<div class="flex justify-between items-center py-1 gap-3"><span class="min-w-0"><span class="block font-bold text-slate-700">${label}</span>${sub ? `<span class="block text-[10px] text-slate-400 font-normal">${sub}</span>` : ""}</span><input type="checkbox" data-change="setting" data-key="${key}" ${on ? "checked" : ""} class="accent-sky-600 w-4 h-4 cursor-pointer shrink-0" aria-label="${label}"></div>`;
    return `${modalHead("\u2699\uFE0F C\xE0i \u0110\u1EB7t WINDTP")}
  <div class="p-5 space-y-3.5 text-xs">
    <div class="flex items-center gap-3 rounded-2xl bg-sky-50/60 border border-sky-100 p-3">
      ${profileAvatar(60)}
      <div class="flex-1 min-w-0"><p class="font-extrabold text-slate-800 text-sm truncate">${esc(state.userName)}</p><p class="text-[10px] text-slate-500">${esc(avatarById(state.avatarId).name)} \u2022 ${esc(frameById(myFrameId()).name)}<br><span class="text-teal-600 font-extrabold">Cảnh giới: ${esc(cultivationRank().name)} · Đăng nhập ${state.loginStreak}/365 ngày</span></p></div>
      <button data-action="open-profile" class="${btnPrimary} whitespace-nowrap">\u0110\u1ED5i avatar</button>
    </div>
    <div><label class="font-bold text-slate-700" for="set-name">T\xEAn hi\u1EC3n th\u1ECB</label><input id="set-name" data-change="name" maxlength="30" value="${esc(state.userName)}" class="${field} mt-1"></div>
    <div class="rounded-2xl border border-slate-200 p-3 space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <div><label class="font-bold text-slate-700" for="set-gender">Giới tính</label><select id="set-gender" data-change="gender" class="${field} mt-1"><option value="">Chưa chọn</option><option value="nam" ${s.gender === "nam" ? "selected" : ""}>♂ Nam</option><option value="nu" ${s.gender === "nu" ? "selected" : ""}>♀ Nữ</option><option value="khac" ${s.gender === "khac" ? "selected" : ""}>⚧ Khác</option></select></div>
        <div><label class="font-bold text-slate-700" for="set-birth">Ngày sinh</label><input id="set-birth" type="date" data-change="birth" min="${new Date().getFullYear() - 120}-01-01" max="${todayIso()}" value="${esc(ui.birthPending || s.birth || "")}" ${s.birth && ui.birthEdit !== 2 ? "disabled" : ""} class="${field} mt-1"></div>
      </div>
      ${(!s.birth || ui.birthEdit === 2) && ui.birthPending ? `<div style="border-radius:12px;padding:10px;background:#eff6ff;border:1px solid #93c5fd"><p style="margin:0 0 6px;color:#1e3a8a;font-size:12px">Xác nhận ngày sinh <b>${esc(ui.birthPending.split("-").reverse().join("/"))}</b> (<b>${ageFromBirth(ui.birthPending)}</b> tuổi)?<br><span style="font-size:10px">${s.birth ? "Ngày sinh mới sẽ thay thế ngày sinh cũ." : "Sau khi xác nhận sẽ <b>không thể thay đổi</b>."}</span></p><div style="display:flex;gap:8px"><button data-action="birth-confirm" class="${btnPrimary}">Xác nhận</button><button data-action="birth-cancel" class="${btnGhost}">Chọn lại</button></div></div>` : ""}
      ${s.birth ? ageGroupBox(s.birth) + (ui.birthEdit === 1 ? `<div style="border-radius:12px;padding:10px;background:#fffbeb;border:1px solid #fcd34d"><p style="margin:0 0 6px;color:#92400e;font-size:12px"><b>Cam kết trước khi sửa:</b> Tôi cam kết khai đúng ngày sinh thật của mình. Tuổi được dùng để giới hạn game đánh bài (từ 12 tuổi) và mua Chips bằng tiền (từ 18 tuổi); khai sai có thể bị khóa các tính năng này.</p><div style="display:flex;gap:8px"><button data-action="birth-edit-ok" class="${btnPrimary}">Tôi cam kết, tiếp tục</button><button data-action="birth-edit-cancel" class="${btnGhost}">Hủy</button></div></div>` : ui.birthEdit === 2 ? `<button data-action="birth-edit-cancel" class="${btnGhost}">Hủy sửa ngày sinh</button>` : `<button data-action="birth-edit" class="${btnGhost}">✏️ Sửa ngày sinh</button>`) : `<p class="text-[10px] text-slate-500">Ngày sinh cần khai đúng sự thật; sau khi lưu, muốn sửa phải xác nhận cam kết. Game có giới hạn độ tuổi cho một số mục (game đánh bài từ 12 tuổi, mua Chips bằng tiền từ 18 tuổi).</p>`}
      <p class="text-[10px] text-slate-500">${s.birth ? "Ngày sinh đã được xác nhận. " : ""}${s.gender ? "" : "Bạn chưa chọn giới tính. "}Giới tính và tuổi hiện trên khung người chơi trong game.</p>
    </div>
    ${tog("dark", s.dark, "Giao diện tối (Dark Mode)")}
    ${tog("autoDark", s.autoDark !== false, "Tự động bật giao diện tối lúc 19:00, tắt lúc 7:00 sáng", "Muốn quay lại giao diện sáng, hãy tắt Dark Mode ở đây")}
    ${tog("sound", s.sound, "Nh\u1EA1c n\u1EC1n", "Cho ph\xE9p ph\xE1t nh\u1EA1c \u1EDF m\u1EE5c Gi\u1EA3i tr\xED")}
    ${tog("sfx", s.sfx, "\xC2m thanh hi\u1EC7u \u1EE9ng n\xFAt b\u1EA5m", "Ti\u1EBFng b\u1EA5m n\xFAt, nh\u1EADn WIND Coin, \u0111\xFAng/sai khi l\xE0m b\xE0i")}
    <div class="rounded-2xl border border-slate-200 p-3 space-y-3">
      <div><p class="font-extrabold text-slate-800 mb-2">Âm thanh trả lời đúng</p><div class="grid grid-cols-1 sm:grid-cols-3 gap-2">${sfxChoices("right")}</div></div>
      <div><p class="font-extrabold text-slate-800 mb-2">Âm thanh trả lời sai</p><div class="grid grid-cols-1 sm:grid-cols-3 gap-2">${sfxChoices("wrong")}</div></div>
      <p class="text-[10px] text-slate-500">Chọn một kiểu âm thanh trong mỗi nhóm. Nút sẽ phát thử ngay.</p>
    </div>
    ${tog("push", s.push, "Hi\u1EC7n ch\u1EA5m th\xF4ng b\xE1o")}
    <div><label class="font-bold text-slate-700" for="set-cur">\u0110\u01A1n v\u1ECB ti\u1EC1n \u1EDF WIND Store</label>
      <select id="set-cur" data-change="currency" class="${field} mt-1"><option value="VND" ${s.currency === "VND" ? "selected" : ""}>\u{1F1FB}\u{1F1F3} \u20AB VND</option><option value="KRW" ${s.currency === "KRW" ? "selected" : ""}>\u{1F1F0}\u{1F1F7} \u20A9 Won</option><option value="JPY" ${s.currency === "JPY" ? "selected" : ""}>\u{1F1EF}\u{1F1F5} \xA5 Y\xEAn</option></select></div>
    <div class="rounded-xl bg-slate-100 p-3 text-[11px] text-slate-600">D\u1EEF li\u1EC7u \u0111\u01B0\u1EE3c l\u01B0u ngay trong tr\xECnh duy\u1EC7t n\xE0y. M\u1EE9c \u0111\u1ED9 h\u1ECDc hi\u1EC7n t\u1EA1i: ${LEVELS[ui.match.level]}.</div>
    <button data-action="open-cultivation-system" class="w-full rounded-xl border border-violet-200 p-3 text-left font-extrabold text-violet-800" style="background:linear-gradient(100deg,#f5d0fe,#dbeafe,#ccfbf1)">🌌 Hệ thống cảnh giới tu tiên <span class="block text-[10px] font-normal mt-1">Xem tất cả cảnh giới, thời gian thăng cấp và quy định hạ cấp</span></button>
    ${adminSection()}
    <button data-action="reset-data" class="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs transition-colors">\u0110\u1EB7t l\u1EA1i to\xE0n b\u1ED9 d\u1EEF li\u1EC7u demo</button>
  </div>`;
  }
  function adminCosmeticPanel() {
    if (!isAdmin()) return "";
    const avOn = state.avatarId === ADMIN_AVATAR_ID, frOn = state.frameId === ADMIN_FRAME_ID;
    const card = (title, sub, preview, on, kind, id) => `<div class="adm-id-card${on ? " on" : ""}"><div class="flex justify-center" style="padding:${kind === "frame" ? "16px 0 8px" : "6px 0 8px"}">${preview}</div><p style="font-size:11px;font-weight:900;color:#fff">${title}</p><p style="margin:2px 0 6px">${sub}</p>${on ? '<span class="adm-id-btn" style="background:rgba(16,185,129,.35);color:#d1fae5">\u0110ang d\u00F9ng</span>' : `<button data-action="equip-cosmetic" data-kind="${kind}" data-id="${id}" class="adm-id-btn">S\u1EED d\u1EE5ng</button>`}</div>`;
    return `<div class="adm-id">
      <div class="flex items-center justify-between gap-2"><h3>\u{1F451} \u0110\u1EB7c quy\u1EC1n M\u00E1y ch\u1EE7</h3><span style="font-size:9px;font-weight:800;color:#fde68a;border:1px solid rgba(253,224,71,.5);border-radius:99px;padding:1px 7px">Ch\u1EC9 BigBoss</span></div>
      <p style="margin-top:3px">D\u00F9ng logo \u1EE9ng d\u1EE5ng l\u00E0m avatar v\u00E0 khung ri\u00EAng. T\u00E0i kho\u1EA3n th\u01B0\u1EDDng kh\u00F4ng th\u1EA5y v\u00E0 kh\u00F4ng ch\u1ECDn \u0111\u01B0\u1EE3c.</p>
      <div class="adm-id-grid">
        ${card("Logo trang ch\u1EE7", "Gi\u1ED1ng logo WINDTP", renderPfp(state.userName, ADMIN_AVATAR_ID, "none", 84), avOn, "avatar", ADMIN_AVATAR_ID)}
        ${card("Ho\u00E0ng Kim Thi\u00EAn \u0110\u1EBF", "Khung \u0111\u1ED9c quy\u1EC1n", renderPfp(state.userName, ADMIN_AVATAR_ID, ADMIN_FRAME_ID, 84), frOn, "frame", ADMIN_FRAME_ID)}
      </div>
      <button data-action="admin-equip-set" class="adm-id-btn go" style="margin-top:10px;padding:8px 0;font-size:11px">${avOn && frOn ? "\u2713 \u0110ang d\u00F9ng tr\u1ECDn b\u1ED9" : "\u2728 D\u00F9ng tr\u1ECDn b\u1ED9 Logo + Khung Thi\u00EAn \u0110\u1EBF"}</button>
    </div>`;
  }
  function profileModal() {
    const tab = ui.profileTab;
    const streak = state.loginStreak;
    const kind = tab === "avatar" ? "avatar" : "frame";
    const allAvatarItems = AVATARS.filter((x) => x.unlock !== "admin" || isAdmin());
    const items = tab === "avatar" ? (ui.avatarCategory === "zodiac" ? allAvatarItems.filter((x) => x.id.startsWith("z-")) : ui.avatarCategory === "chinese" ? allAvatarItems.filter((x) => x.id.startsWith("c-")) : ui.avatarCategory === "age" ? allAvatarItems.filter((x) => x.id.startsWith("age-")) : ui.avatarCategory === "streak" ? allAvatarItems.filter((x) => x.id.startsWith("streak-")) : ui.avatarCategory === "special" ? allAvatarItems.filter((x) => x.id.startsWith("special-")) : allAvatarItems) : FRAMES.filter((x) => x.unlock !== "admin" || isAdmin());
    const equipped = tab === "avatar" ? state.avatarId : myFrameId();
    const tabBtn = (t, label) => `<button data-action="profile-tab" data-t="${t}" aria-pressed="${tab === t}" class="flex-1 py-2 rounded-xl text-xs font-bold ${tab === t ? "bg-sky-600 text-white keep-white" : "bg-white border border-slate-200 text-slate-600"}">${label}</button>`;
    return `${modalHead("\u{1F5BC}\uFE0F Avatar & Khung")}
  <div class="p-5 space-y-4">
    <div class="flex items-center gap-4 rounded-2xl bg-sky-50/60 border border-sky-100 p-3">
      ${profileAvatar(72)}
      <div class="min-w-0 flex-1">
        <p class="text-sm font-extrabold text-slate-800 truncate">${esc(state.userName)}</p>
        <p class="text-[11px] text-slate-500">S\u1ED1 d\u01B0: <b class="text-amber-600">${fmt(state.balance)} Xu</b></p>
        <p class="text-[11px] text-slate-500">Chu\u1ED7i \u0111\u0103ng nh\u1EADp: <b class="text-emerald-600">${Math.min(streak, STREAK_DAYS)}/${STREAK_DAYS} ng\xE0y</b>${streak >= STREAK_DAYS ? " \u2713" : ""}</p>
      </div>
    </div>
    ${adminCosmeticPanel()}
    ${tab === "avatar" ? `<div class="glass-card rounded-2xl p-3 border border-amber-200 bg-amber-50/60">
      <div class="flex items-center justify-between gap-2 mb-2"><h3 class="text-xs font-extrabold text-slate-800">🎁 Bộ ảnh đăng nhập liên tiếp</h3><span class="text-[10px] text-amber-700 font-bold">Đẹp dần theo mốc</span></div>
      <div class="grid grid-cols-3 gap-2">
        ${[["streak-7",7],["streak-15",15],["streak-30",30]].map(([id,need]) => { const unlocked=streakProgress()>=need; return `<div class="rounded-xl bg-white border ${unlocked ? "border-emerald-300" : "border-amber-100"} p-2 text-center"><div class="flex justify-center">${renderPfp(state.userName,id,"none",64)}</div><p class="text-[10px] font-extrabold text-slate-700 mt-1">${need} ngày</p><p class="text-[9px] ${unlocked ? "text-emerald-600" : "text-slate-400"}">${unlocked ? "✓ Đã mở khóa" : `${streakProgress()}/${need}`}</p></div>`; }).join("")}
      </div>
    </div>` : `<div class="glass-card rounded-2xl p-3 border border-violet-200 bg-violet-50/60">
      <div class="flex items-center justify-between gap-2 mb-2"><h3 class="text-xs font-extrabold text-slate-800">🎁 Bộ khung avatar đăng nhập liên tiếp</h3><span class="text-[10px] text-violet-700 font-bold">Khung thưởng miễn phí</span></div>
      <div class="grid grid-cols-3 gap-2">
        ${[["f-bronze7",7],["f-silver15",15],["f-jade30",30]].map(([id,need]) => { const unlocked=streakProgress()>=need; return `<div class="rounded-xl bg-white border ${unlocked ? "border-emerald-300" : "border-violet-100"} p-2 text-center"><div class="flex justify-center">${renderPfp(state.userName,state.avatarId,id,64)}</div><p class="text-[10px] font-extrabold text-slate-700 mt-1">${need} ngày</p><p class="text-[9px] ${unlocked ? "text-emerald-600" : "text-slate-400"}">${unlocked ? "✓ Đã mở khóa" : `${streakProgress()}/${need}`}</p></div>`; }).join("")}
      </div>
    </div>`}
    <div class="flex gap-2">${tabBtn("avatar", "\u{1F642} Avatar")}${tabBtn("frame", "\u2B55 Khung avatar")}</div>
    
    ${tab === "avatar" ? `<div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5"><button data-action="avatar-category" data-cat="streak" class="py-1.5 rounded-lg text-[10px] font-bold ${ui.avatarCategory === "streak" ? "bg-sky-600 text-white keep-white" : "bg-white border border-slate-200 text-slate-600"}">Đăng nhập 7/15/30 ngày</button><button data-action="avatar-category" data-cat="all" class="py-1.5 rounded-lg text-[10px] font-bold ${ui.avatarCategory === "all" ? "bg-sky-600 text-white keep-white" : "bg-white border border-slate-200 text-slate-600"}">Tất cả</button><button data-action="avatar-category" data-cat="zodiac" class="py-1.5 rounded-lg text-[10px] font-bold ${ui.avatarCategory === "zodiac" ? "bg-sky-600 text-white keep-white" : "bg-white border border-slate-200 text-slate-600"}">12 Cung</button><button data-action="avatar-category" data-cat="chinese" class="py-1.5 rounded-lg text-[10px] font-bold ${ui.avatarCategory === "chinese" ? "bg-sky-600 text-white keep-white" : "bg-white border border-slate-200 text-slate-600"}">12 Con giáp</button><button data-action="avatar-category" data-cat="age" class="py-1.5 rounded-lg text-[10px] font-bold ${ui.avatarCategory === "age" ? "bg-sky-600 text-white keep-white" : "bg-white border border-slate-200 text-slate-600"}">Độ tuổi</button><button data-action="avatar-category" data-cat="special" class="py-1.5 rounded-lg text-[10px] font-bold ${ui.avatarCategory === "special" ? "bg-sky-600 text-white keep-white" : "bg-white border border-slate-200 text-slate-600"}">Khác 25k</button></div>` : ""}    <p class="text-[11px] text-slate-500">Bộ avatar đã làm mới: 12 cung hoàng đạo và 6 nhóm tuổi (Nam/Nữ): 20.000 WIND Coin; con giáp, avatar đặc biệt và khung: 25.000 WIND Coin. Ảnh đặc biệt nhận miễn phí khi đăng nhập + điểm danh đủ 7 / 15 / 30 ngày liên tiếp.</p>
    ${tab === "frame" ? `<div class="rounded-2xl p-3 border border-fuchsia-200 text-[11px] font-bold text-fuchsia-800" style="background:linear-gradient(100deg,#fae8ff,#e0f2fe)">🌌 9 khung cảnh giới ở đầu danh sách: tự động nhận khi thăng cảnh giới, cảnh giới càng cao hiệu ứng càng rực rỡ (hiện tại: ${esc(cultivationRank().name)}).</div>` : ""}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 avatar-gallery">
      ${items.map((it) => {
      const owned = isOwned(kind, it.id);
      const on = equipped === it.id;
      const preview = tab === "avatar" ? renderPfp(state.userName, it.id, myFrameId(), 92) : renderPfp(state.userName, state.avatarId, it.id, 88);
      let btn;
      if (on) btn = '<span class="block py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700">\u0110ang d\xF9ng</span>';
      else if (owned) btn = `<button data-action="equip-cosmetic" data-kind="${kind}" data-id="${it.id}" class="w-full py-1 rounded-lg text-[10px] font-bold bg-sky-600 text-white keep-white">S\u1EED d\u1EE5ng</button>`;
      else if (["streak7","streak15","streak30"].includes(it.unlock)) { const need = it.rewardDays || 7; const prog = streakProgress(); btn = prog >= need ? `<button data-action="claim-cosmetic" data-kind="${kind}" data-id="${it.id}" class="w-full py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white keep-white">Nhận miễn phí</button>` : `<span class="block py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500">🎁 ${prog}/${need} ngày liên tiếp</span>`; }
      else if (it.unlock === "premium") btn = `<button data-action="open-premium" class="w-full py-1 rounded-lg text-[10px] font-bold text-white keep-white bg-gradient-to-r from-amber-500 to-pink-500">👑 Cần Premium</button>`;
      else if (it.unlock === "realm") btn = `<span class="block py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500">🔒 Đạt ${CULTIVATION_RANKS[it.realm].name}</span>`;
      else btn = `<button data-action="buy-cosmetic" data-kind="${kind}" data-id="${it.id}" class="w-full py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-white keep-white">\u{1FA99} ${fmt(it.price)}</button>`;
      return `<div class="rounded-2xl border ${on ? "border-sky-400 bg-sky-50/60" : "border-slate-200 bg-white"} p-2 text-center space-y-1.5">
          <div class="flex justify-center" style="padding:${tab === "frame" ? "12px 0" : "4px 0"}">${preview}</div>
          <p class="text-[11px] font-bold text-slate-700 leading-tight min-h-[26px] flex items-center justify-center">${esc(it.name)}</p>
          ${btn}
        </div>`;
    }).join("")}
    </div>
    <button data-action="open-settings" class="w-full ${btnGhost}">&larr; Quay l\u1EA1i C\xE0i \u0111\u1EB7t</button>
  </div>`;
  }

  // src/app.ts
  var val = (id) => ($(`#${id}`)?.value ?? "").trim();
  function applyTheme() {
    document.documentElement.classList.toggle("dark", state.settings.dark);
    setSfxEnabled(state.settings.sfx);
  }
  function renderAll() {
    renderHeader();
    renderNav();
    renderTab(ui.tab);
    if (!$("#notice-panel")?.classList.contains("hidden")) renderNotices();
  }
  function isTab(v) {
    return !!v && TABS.includes(v);
  }
  function goTo(tab, cat, push = true) {
    if (tab === "learn") ui.learnStage = "language";
    ui.tab = tab;
    if (tab === "utilities" && cat) ui.utilCat = cat;
    closePanels(true);
    showTab(tab);
    renderTab(tab);
    renderNav();
    if (push) {
      try {
        history.pushState(null, "", "#/" + tab);
      } catch {
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function closePanels(markRead) {
    const np = $("#notice-panel");
    if (np && !np.classList.contains("hidden")) {
      np.classList.add("hidden");
      if (markRead && state.notices.some((n) => !n.read)) {
        state.notices.forEach((n) => {
          n.read = true;
        });
        commit();
      }
    }
    $("#search-panel")?.classList.add("hidden");
  }
  var BANNER_THEMES = [
    { logo: "from-sky-500 via-blue-500 to-indigo-600", char: "text-sky-600", brand: "from-sky-600 via-indigo-600 to-blue-600" },
    { logo: "from-orange-500 via-pink-500 to-purple-600", char: "text-orange-600", brand: "from-orange-600 via-pink-600 to-purple-600" },
    { logo: "from-emerald-500 via-teal-500 to-blue-600", char: "text-emerald-600", brand: "from-emerald-600 via-teal-600 to-blue-600" },
    { logo: "from-purple-500 via-indigo-500 to-sky-600", char: "text-purple-600", brand: "from-purple-600 via-indigo-600 to-sky-600" },
    { logo: "from-indigo-500 via-violet-500 to-sky-500", char: "text-indigo-600", brand: "from-indigo-600 via-violet-600 to-sky-600" }
  ];
  function setBanner(i) {
    ui.slide = (i % BANNERS.length + BANNERS.length) % BANNERS.length;
    const slider = $("#banner-slider");
    if (slider) slider.style.transform = `translateX(-${ui.slide * 100}%)`;
    $$(".banner-dot").forEach((dot, idx) => {
      const on = idx === ui.slide;
      dot.classList.toggle("w-4", on);
      dot.classList.toggle("bg-white", on);
      dot.classList.toggle("w-2", !on);
      dot.classList.toggle("bg-white/50", !on);
    });
    const th = BANNER_THEMES[ui.slide];
    const logo = $("#logo-circle");
    const ch = $("#logo-char");
    const brand = $("#brand-text");
    if (logo) logo.className = `w-10 h-10 rounded-full bg-gradient-to-tr ${th.logo} p-0.5 shadow-md shadow-sky-200 group-hover:scale-105 transition-all duration-500 flex items-center justify-center`;
    if (ch) ch.className = `font-black ${th.char} text-lg transition-colors duration-500`;
    if (brand) brand.className = `font-extrabold text-lg tracking-tight bg-gradient-to-r ${th.brand} bg-clip-text text-transparent transition-all duration-500`;
  }
  function makeQuestion(lang, item) {
    const others = shuffle(lang.vocab.filter((v) => v !== item)).slice(0, 3);
    if (Math.random() < 0.5) {
      const options2 = shuffle([item.meaning, ...others.map((o) => o.meaning)]);
      return { prompt: item.term, sub: `${lang.flag} ${lang.name}: t\u1EEB n\xE0y ngh\u0129a l\xE0 g\xEC?`, options: options2, answer: options2.indexOf(item.meaning) };
    }
    const options = shuffle([item.term, ...others.map((o) => o.term)]);
    return { prompt: item.meaning, sub: `${lang.flag} Ch\u1ECDn t\u1EEB ${lang.name} t\u01B0\u01A1ng \u1EE9ng`, options, answer: options.indexOf(item.term) };
  }
  function gameQuestion(lang) {
    const item = lang.vocab[Math.floor(Math.random() * lang.vocab.length)];
    return makeQuestion(lang, item);
  }
  function grammarQuestion(lang, g) {
    const options = shuffle([g.title, ...shuffle(lang.grammar.filter((x) => x.title !== g.title)).slice(0, 3).map((x) => x.title)]);
    return { prompt: g.example, sub: `${lang.flag} C\xE2u n\xE0y d\xF9ng c\u1EA5u tr\xFAc ng\u1EEF ph\xE1p n\xE0o?`, options, answer: options.indexOf(g.title) };
  }
  function certQuestions(lang) {
    enrichDaily(lang);
    const vocab = shuffle(lang.vocab).slice(0, 4).map((v) => makeQuestion(lang, v));
    const grammar = shuffle(lang.grammar).slice(0, 3).map((g) => grammarQuestion(lang, g));
    return shuffle([...vocab, ...grammar]);
  }
  var PRACTICE_TITLE = { listen: "\u{1F3A7} Luy\u1EC7n Nghe", read: "\u{1F440} Luy\u1EC7n \u0110\u1ECDc", write: "\u270D\uFE0F Luy\u1EC7n Vi\u1EBFt" };
  function practiceQuestions(lang, mode) {
    const dl = dailyLesson(lang);
    const rnd = mulberry(hashStr(lang.code + "|" + dl.no + "|" + mode));
    const sh = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; };
    return dl.vocab.map((vi) => {
      const item = lang.vocab[vi];
      const others = sh(lang.vocab.filter((v) => v !== item)).slice(0, 3);
      if (mode === "listen") {
        const options = sh([item.meaning, ...others.map((o) => o.meaning)]);
        return { prompt: "\u{1F3A7}", sub: `${lang.flag} Nghe v\xE0 ch\u1ECDn ngh\u0129a \u0111\xFAng`, options, answer: options.indexOf(item.meaning), speak: (lang.code === "ja" && item.reading && /[\u3040-\u30ff]/.test(item.reading)) ? item.reading.replace(/[（()）]/g, "") : item.term, speakLang: LANG_VOICE[lang.code] };
      }
      if (mode === "read") {
        const options = sh([item.exampleVi, ...others.map((o) => o.exampleVi)]);
        return { prompt: item.example, sub: `${lang.flag} \u0110\u1ECDc c\xE2u v\xE0 ch\u1ECDn b\u1EA3n d\u1ECBch \u0111\xFAng`, options, answer: options.indexOf(item.exampleVi) };
      }
      const asian = lang.code === "zh" || lang.code === "ja" || lang.code === "ko";
      return {
        prompt: item.meaning,
        sub: `${lang.flag} Vi\u1EBFt t\u1EEB ${lang.name} t\u01B0\u01A1ng \u1EE9ng`,
        options: [],
        answer: -1,
        write: asian ? [item.term, item.reading] : [item.term],
        hint: asian ? "G\xF5 ch\u1EEF g\u1ED1c ho\u1EB7c phi\xEAn \xE2m (pinyin / romaji / romanization)." : "Kh\xF4ng ph\xE2n bi\u1EC7t ch\u1EEF hoa, ch\u1EEF th\u01B0\u1EDDng v\xE0 d\u1EA5u."
      };
    });
  }
  function writeMatches(typed, accepted) {
    const clean = (x) => norm(x).replace(/[/.,!?'’"]/g, "").replace(/\s+/g, " ").trim();
    const strip = (x) => x.replace(/^(der|die|das|el|la|le|les|un|une|una|l)\s+/, "");
    const t = clean(typed);
    if (!t) return false;
    return accepted.some((a) => {
      const c = clean(a);
      return t === c || t === strip(c) || strip(t) === strip(c);
    });
  }
  function baseQuiz(kind, title, certKey, lang, questions) {
    return { kind, title, certKey, lang, questions, idx: 0, correct: 0, streak: 0, target: 10, picked: null, finished: false, rewarded: 0, started: false, wrote: "", wroteOk: false };
  }
  function startGame(code) {
    const lang = langByCode(code);
    ui.quiz = baseQuiz("game", `\u{1F3AF} \u0110\u1ED1 Vui ${lang.name} ${lang.flag}`, "game", lang.code, [gameQuestion(lang)]);
    openModal(quizModal);
  }
  function startCertQuiz(certId) {
    const lang = langByCode(state.lang ?? "en");
    if (!dailyReady(lang)) { enrichDaily(lang); toast("Đang tải bài học, hãy thử lại sau giây lát"); return; }
    const cert = lang.certs.find((c) => c.id === certId) ?? lang.certs[0];
    ui.quiz = baseQuiz("cert", `\u{1F4DD} Gi\u1EA3i \u0111\u1EC1 th\u1EED ${cert.name}`, cert.id, lang.code, certQuestions(lang));
    openModal(quizModal);
  }
  function startPractice(mode) {
    const lang = langByCode(state.lang ?? "en");
    if (!dailyReady(lang)) { enrichDaily(lang); toast("Đang tải bài học, hãy thử lại sau giây lát"); return; }
    ui.quiz = baseQuiz("practice", `${PRACTICE_TITLE[mode]} ${lang.name} ${lang.flag}`, mode, lang.code, practiceQuestions(lang, mode));
    openModal(quizModal);
    speakCurrent();
  }
  function speakCurrent() {
    const q = ui.quiz;
    if (!q) return;
    const cur = q.questions[q.idx];
    if (cur?.speak) speak(cur.speak, cur.speakLang ?? "en-US");
  }
  function downloadDoc(code) {
    const l = langByCode(code);
    const lines = [`WINDTP - T\u1ED5ng h\u1EE3p t\u1EEB v\u1EF1ng & ng\u1EEF ph\xE1p ${l.name}`, "=".repeat(48), "", "T\u1EEA V\u1EF0NG"];
    l.vocab.forEach((v, i) => lines.push(`${i + 1}. ${v.term} (${v.reading}) - ${v.meaning}`, `   V\xED d\u1EE5: ${v.example}`, `   D\u1ECBch: ${v.exampleVi}`));
    lines.push("", "NG\u1EEE PH\xC1P");
    l.grammar.forEach((g, i) => lines.push(`${i + 1}. ${g.title}`, `   C\u1EA5u tr\xFAc: ${g.pattern}`, `   Gi\u1EA3i th\xEDch: ${g.explain}`, `   V\xED d\u1EE5: ${g.example}`, `   D\u1ECBch: ${g.exampleVi}`));
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `windtp-${l.code}-tong-hop.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
    toast(`\u0110\xE3 t\u1EA3i t\xE0i li\u1EC7u ${l.name}`);
  }
  function openListing(id) {
    if (!state.listings.some((l) => l.id === id)) return;
    openModal(() => {
      const l = state.listings.find((x) => x.id === id);
      return l ? listingModal(l) : "";
    });
  }
  function openTool(tool) {
    if (tool === "pomodoro") openModal(pomodoroModal);
    else if (tool === "reminders") openModal(remindersModal);
    else if (tool === "gpa") openModal(gpaModal);
  }
  function openTopup() {
    ui.topup = null; ui.topupCode = null;
    openModal(topupModal);
  }
  function requireFunds(amount) {
    if (state.balance >= amount) return true;
    toast(`S\u1ED1 d\u01B0 kh\xF4ng \u0111\u1EE7, c\xF2n thi\u1EBFu ${fmt(amount - state.balance)} Xu`);
    openTopup();
    return false;
  }
  function pomoTick() {
    const p = ui.pomo;
    if (!p.running) return;
    p.remaining -= 1;
    if (p.remaining <= 0) {
      p.running = false;
      if (p.mode === "focus") {
        p.sessions += 1;
        p.mode = "break";
        p.remaining = 5 * 60;
        toast("H\u1EBFt gi\u1EDD t\u1EADp trung, ngh\u1EC9 5 ph\xFAt nh\xE9!");
      } else {
        p.mode = "focus";
        p.remaining = 25 * 60;
        toast("H\u1EBFt gi\u1EDD ngh\u1EC9, s\u1EB5n s\xE0ng phi\xEAn m\u1EDBi!");
      }
      if (ui.renderModal === pomodoroModal) refreshModal();
      return;
    }
    const t = $("#pomo-time");
    if (t) t.textContent = fmtClock(p.remaining);
  }
  var LISTING_EMOJI = { market: "🏷️", jobs: "🧑‍💻", housing: "🏡" };
  var actions = {
    /* ---- navigation / header ---- */
    goto: (el) => {
      const tab = el.dataset.tab;
      if (isTab(tab)) goTo(tab, el.dataset.cat);
    },
    "set-banner": (el) => { ui.bannerTouch = Date.now(); setBanner(Number(el.dataset.i ?? 0)); },
    "open-settings": () => openModal(settingsModal),
    "open-cultivation-system": () => openModal(cultivationModal),
    "back-settings-from-realms": () => openModal(settingsModal),
    "close-modal": () => closeModal(),
    "toggle-search": () => {
      $("#mobile-search")?.classList.toggle("hidden");
      $("#search-input-m")?.focus();
    },
    "toggle-notices": () => {
      const panel = $("#notice-panel");
      if (!panel) return;
      if (panel.classList.contains("hidden")) {
        $("#search-panel")?.classList.add("hidden");
        renderNotices();
        panel.classList.remove("hidden");
      } else {
        closePanels(true);
      }
    },
    "read-all": () => {
      state.notices.forEach((n) => {
        n.read = true;
      });
      commit();
      toast("\u0110\xE3 \u0111\xE1nh d\u1EA5u t\u1EA5t c\u1EA3 l\xE0 \u0111\xE3 \u0111\u1ECDc");
    },
    "open-result": (el) => {
      const kind = el.dataset.kind;
      const id = el.dataset.id ?? "";
      closePanels(true);
      ["#search-input", "#search-input-m"].forEach((s) => {
        const i = $(s);
        if (i) i.value = "";
      });
      if (kind === "product") {
        const p = PRODUCTS.find((x) => x.id === id);
        ui.shopCat = "all";
        ui.shopQuery = p ? p.name : "";
        goTo("shop");
        if (p) openProduct_(p.id);
      } else if (kind === "course") {
        goTo("home");
      } else if (kind === "listing") {
        goTo("utilities", "all");
        openListing(id);
      } else if (kind === "lang") {
        state.lang = id;
        ui.learnStage = "menu";
        commit();
        goTo("learn");
        ui.learnStage = "menu";
        renderLearn();
      } else if (kind === "tool") {
        goTo("utilities", "other");
        openTool(id);
      } else if (kind === "post") {
        goTo("community");
      }
    },
    /* ---- learning ---- */
    "home-review": (el) => {
      const picker = document.getElementById("learn-home-language");
      state.lang = picker?.value || state.lang || "en";
      commit();
      const mode = el.dataset.mode;
      actions[mode === "grammar" ? "open-grammar" : mode === "practice" ? "open-practice" : "open-vocab"]();
    },
    "home-open-cultivation": () => {
      const picker = document.getElementById("learn-home-language");
      const code = picker?.value || state.lang || "en";
      state.lang = code;
      ui.learnStage = "menu";
      commit();
      goTo("learn");
      renderLearn();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    "select-lang": (el) => {
      const code = el.dataset.code;
      state.lang = code;
      ui.learnStage = "menu";
      commit();
      renderLearn();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    "learn-back-language": () => { ui.learnStage = "language"; renderLearn(); },
    "learn-back-menu": () => { ui.learnStage = "menu"; renderLearn(); },
    "open-daily-study": () => { ui.learnStage = "daily"; renderLearn(); },
    "open-book-library": () => { ui.learnStage = "library"; renderLearn(); },
    "open-strokes": () => { ui.learnStage = "strokes"; renderLearn(); },
    "focus-draft": () => { const t = document.getElementById("post-draft"); if (t) { t.scrollIntoView({ behavior: "smooth", block: "center" }); t.focus(); } },
    "open-vocab": () => {
      if (!state.lang) return;
      const lang = langByCode(state.lang);
      if (!dailyReady(lang)) { enrichDaily(lang); toast("Đang tải bài học, hãy thử lại sau giây lát"); return; }
      ui.flash = { lang: lang.code, order: dailyLesson(lang).vocab.slice(), pos: 0, flipped: false, knownNow: 0, done: false };
      openModal(vocabModal);
    },
    "flip-card": (el) => {
      if (!ui.flash) return;
      ui.flash.flipped = !ui.flash.flipped;
      el.querySelector(".card-face")?.classList.toggle("flipped", ui.flash.flipped);
    },
    "vocab-answer": (el) => {
      const f = ui.flash;
      if (!f) return;
      const lang = langByCode(f.lang);
      const term = lang.vocab[f.order[f.pos]].term;
      if (el.dataset.known === "1") {
        const list = state.known[lang.code] ?? (state.known[lang.code] = []);
        if (!list.includes(term)) {
          list.push(term);
          f.knownNow += 1;
        }
      } else {
        state.known[lang.code] = (state.known[lang.code] ?? []).filter((t) => t !== term);
      }
      f.pos += 1;
      f.flipped = false;
      if (f.pos >= f.order.length) {
        f.done = true;
        completeLesson(`vocab:${lang.code}`);
      }
      commit();
      refreshModal();
    },
    "vocab-restart": () => {
      const f = ui.flash;
      if (!f) return;
      const lang = langByCode(f.lang);
      ui.flash = { lang: lang.code, order: shuffle(dailyLesson(lang).vocab), pos: 0, flipped: false, knownNow: 0, done: false };
      refreshModal();
    },
    "open-grammar": () => openModal(grammarModal),
    "grammar-done": (el) => {
      if (!state.lang) return;
      completeLesson(`grammar:${state.lang}:${el.dataset.i}`);
      commit();
      refreshModal();
    },
    "open-practice": () => {
      if (!state.lang) return;
      openModal(practiceModal);
    },
    "start-practice": (el) => startPractice(el.dataset.mode ?? "listen"),
    "open-dialog": () => {
      if (!state.lang) return;
      const lang = langByCode(state.lang);
      ui.dialog = { lang: lang.code, idx: 0, picked: null, order: shuffle([0, 1, 2]), good: 0, done: false };
      openModal(dialogModal);
    },
    "dialog-pick": (el) => {
      const d = ui.dialog;
      if (!d || d.picked !== null) return;
      const pos = Number(el.dataset.pos);
      const opt = langByCode(d.lang).dialogs[d.idx].options[d.order[pos]];
      d.picked = pos;
      if (opt.correct) d.good += 1;
      sfx(opt.correct ? "right" : "wrong");
      refreshModal();
    },
    "dialog-next": () => {
      const d = ui.dialog;
      if (!d) return;
      const lang = langByCode(d.lang);
      d.idx += 1;
      d.picked = null;
      d.order = shuffle([0, 1, 2]);
      if (d.idx >= lang.dialogs.length) {
        d.done = true;
        d.idx = lang.dialogs.length - 1;
        completeLesson(`dialog:${lang.code}`);
        commit();
      }
      refreshModal();
    },
    "dialog-restart": () => {
      const d = ui.dialog;
      if (!d) return;
      ui.dialog = { lang: d.lang, idx: 0, picked: null, order: shuffle([0, 1, 2]), good: 0, done: false };
      refreshModal();
    },
    "open-cert": (el) => {
      const id = el.dataset.id ?? "";
      openModal(() => certModal(id));
    },
    "start-cert-quiz": (el) => startCertQuiz(el.dataset.id ?? ""),
    "open-course": (el) => {
      const c = COURSES.find((x) => x.id === el.dataset.id);
      if (!c) return;
      state.lang = c.lang;
      commit();
      goTo("learn");
      openModal(() => certModal(c.cert));
    },
    "buy-course": (el) => {
      const c = COURSES.find((x) => x.id === el.dataset.id);
      if (!c) return;
      if (state.owned.includes(c.id)) {
        actions["open-course"](el, new Event("click"));
        return;
      }
      if (!requireFunds(c.price)) return;
      spend(c.price, `Mua kh\xF3a h\u1ECDc ${c.badge}`);
      state.owned.push(c.id);
      notify("\u{1F393}", `B\u1EA1n \u0111\xE3 m\u1EDF kh\xF3a: ${c.title}`);
      commit();
      toast("Mua kh\xF3a h\u1ECDc th\xE0nh c\xF4ng!");
      actions["open-course"](el, new Event("click"));
    },
    /* ---- quiz (certificate exam, practice and the mini game) ---- */
    "start-game": () => openModal(gamePickModal),
    "change-game-lang": () => openModal(gamePickModal),
    "game-lang": (el) => startGame(el.dataset.code ?? "en"),
    "quiz-speak": () => speakCurrent(),
    "quiz-pick": (el) => {
      const q = ui.quiz;
      if (!q || q.picked !== null) return;
      const i = Number(el.dataset.i);
      q.picked = i;
      const right = i === q.questions[q.idx].answer;
      sfx(right ? "right" : "wrong");
      if (q.kind === "game") {
        if (!q.started) {
          q.started = true;
          state.daily.games += 1;
          commit();
        }
        q.streak = right ? q.streak + 1 : 0;
      }
      if (right) q.correct += 1;
      refreshModal();
    },
    "quiz-write": () => {
      const q = ui.quiz;
      if (!q || q.picked !== null) return;
      const cur = q.questions[q.idx];
      const typed = val("qz-write");
      if (!typed) {
        toast("H\xE3y g\xF5 \u0111\xE1p \xE1n c\u1EE7a b\u1EA1n");
        return;
      }
      q.wrote = typed;
      q.wroteOk = writeMatches(typed, cur.write ?? []);
      q.picked = 0;
      if (q.wroteOk) q.correct += 1;
      sfx(q.wroteOk ? "right" : "wrong");
      refreshModal();
    },
    "quiz-next": () => {
      const q = ui.quiz;
      if (!q) return;
      q.picked = null;
      q.wrote = "";
      q.wroteOk = false;
      if (q.kind === "game") {
        if (q.streak >= q.target) {
          q.finished = true;
          state.daily.gameWins += 1;
          commit();
        } else {
          const lang = langByCode(q.lang ?? "en");
          q.questions.push(gameQuestion(lang));
          q.idx += 1;
        }
      } else {
        q.idx += 1;
        if (q.idx >= q.questions.length) {
          q.idx = q.questions.length - 1;
          q.finished = true;
          completeLesson(`${q.kind}:${q.certKey}`);
          commit();
        }
      }
      refreshModal();
      if (!q.finished) speakCurrent();
    },
    "quiz-again": () => {
      const q = ui.quiz;
      if (!q) return;
      if (q.kind === "game") startGame(q.lang ?? "en");
      else if (q.kind === "practice") startPractice(q.certKey);
      else startCertQuiz(q.certKey);
    },
    /* ---- shop ---- */
    "shop-cat": (el) => {
      const cat = el.dataset.cat ?? "all";
      if (cat !== ui.shopCat) {
        ui.shopPay = "money";
        ui.shopSub = cat === "study" ? "Khóa học" : "";
      }
      ui.shopCat = cat;
      renderTab("shop");
    },
    "shop-sub": (el) => {
      ui.shopSub = el.dataset.sub || "";
      renderTab("shop");
    },
    "xu-afford": () => {
      ui.xuAfford = !ui.xuAfford;
      renderTab("shop");
    },
    "shop-pay": (el) => {
      ui.shopPay = el.dataset.pay === "xu" ? "xu" : "money";
      renderTab("shop");
    },
    "add-cart": (el) => {
      const id = el.dataset.id ?? "";
      const p = PRODUCTS.find((x) => x.id === id);
      if (!p) return;
      state.cart[id] = (state.cart[id] ?? 0) + 1;
      commit();
      toast(`\u0110\xE3 th\xEAm "${esc(p.name)}" v\xE0o gi\u1ECF h\xE0ng!`);
    },
    "contact-save": () => {
      const a = ui.afterContact || { kind: "ship" }; saveContact("ct-", CT_KEYS[a.kind]);
      const err = validContact(a.kind); if (err) { toast(err); return; }
      ui.afterContact = null; if (a.next) a.next(); else closeModal();
    },
    "settings-contact-save": () => { saveContact("st-", ["address", "phone", "docEmail", "bank", "bankName", "holder"]); toast("Đã lưu thông tin"); },
    "ut-geo-run": () => { ui.ug = { q: val("ug-q"), country: val("ug-country"), region: val("ug-region") }; renderUtilities(); },
    "ut-geo-clear": () => { ui.ug = null; renderUtilities(); },
    "open-orders": () => { if (isAdmin()) openModal(ordersModal); },
    "admin-confirm": (el) => {
      if (!isAdmin()) return;
      const o = state.orders.find((x) => x.id === el.dataset.id); if (!o || o.status !== "pending") return;
      const xu = val("ao-xu-" + o.id), chip = val("ao-chip-" + o.id);
      o.status = "done"; creditTo(o.uid || userId(), xu, chip, o.kind === "topup" ? "Nạp WIND Coin đã xác nhận" : "Thưởng khi mua hàng WIND Store");
      commit(); refreshModal(); toast("Đã xác nhận đơn");
    },
    "admin-credit": () => { if (!isAdmin()) return; const id = (val("ac-id") || "").trim(); if (!/^WIND-.+/.test(id)) { toast("ID phải có dạng WIND-tên"); return; } toast(creditTo(id, val("ac-xu"), val("ac-chip"), "Admin cộng thưởng") ? "Đã cộng thưởng cho " + id : "Nhập số Xu hoặc chip"); refreshModal(); },
    "payout-done": (el) => { const p = (state.payouts || []).find((x) => x.id === el.dataset.id); if (p) { p.status = "done"; commit(); refreshModal(); } },
    "open-task-add": () => { if (isAdmin()) openModal(taskModal); },
    "task-save": () => {
      if (!isAdmin()) return;
      const title = (val("at-title") || "").trim(), n = (k) => Math.max(0, Math.floor(Number(val(k)) || 0));
      const t = { id: uid("ct"), title, desc: (val("at-desc") || "").trim(), xu: n("at-xu"), chips: n("at-chip"), money: n("at-money"), cur: val("at-cur") || "VND", ts: Date.now() };
      if (!title) { toast("Nhập tên nhiệm vụ"); return; }
      if (!t.xu && !t.chips && !t.money) { toast("Nhập ít nhất một mức thưởng"); return; }
      (state.customTasks = state.customTasks || []).unshift(t); commit(); closeModal(); renderTasks(); toast("Đã đăng nhiệm vụ");
    },
    "task-del": (el) => { if (!isAdmin()) return; state.customTasks = (state.customTasks || []).filter((x) => x.id !== el.dataset.id); commit(); renderTasks(); },
    "ctask-claim": (el) => {
      const t = (state.customTasks || []).find((x) => x.id === el.dataset.id); if (!t) return;
      if ((state.customDone || []).includes(t.id)) return;
      if (t.money > 0 && needContact("bank", () => { closeModal(); actions["ctask-claim"](el); })) return;
      (state.customDone = state.customDone || []).push(t.id);
      if (t.xu) earn(t.xu, "Thưởng nhiệm vụ: " + t.title);
      if (t.chips) state.chips = (state.chips || 0) + t.chips;
      if (t.money) { const c = contact(); (state.payouts = state.payouts || []).unshift({ id: uid("po"), ts: Date.now(), uid: userId(), title: t.title, money: t.money, cur: t.cur, bank: c.bank, bankName: c.bankName, holder: c.holder, status: "pending" }); }
      commit(); renderTasks(); toast("Đã nhận thưởng" + (t.money ? ", tiền sẽ được chuyển vào tài khoản của bạn" : ""));
    },
    "open-orders": () => openModal(ordersModal),
    "ord-tab": (el) => { ui.ordTab = el.dataset.t === "done" ? "done" : "pending"; refreshModal(); },
    "admin-confirm": (el) => {
      if (!isAdmin()) return;
      const o = state.orders.find((x) => x.id === el.dataset.id); if (!o || o.status !== "pending") return;
      const g = orderGrant(o); o.status = "done"; o.doneTs = Date.now();
      creditTo(o.uid || userId(), g.xu, g.chips, o.kind === "topup" ? (o.src === "chip" ? "Mua chip trong game đã xác nhận" : o.src === "game" ? "Mua xu trong game đã xác nhận" : "Nạp WIND Coin đã xác nhận") : "Thưởng khi mua hàng WIND Store", g.courses, g.shop, g.docs);
      if (g.courses.length && o.ref && o.ref !== o.uid) { const rr = state.refRewarded = state.refRewarded || {}; if (!rr[o.uid]) { rr[o.uid] = true; creditTo(o.ref, 1500, 0, "Thưởng mời bạn mua khóa học"); } }
      commit(); refreshModal(); toast(g.doc ? "Đã xác nhận. Nhớ gửi tài liệu cho khách." : "Đã xác nhận đơn");
    },
    "fs-run": () => { ui.fs = { q: val("fs-q"), country: val("fs-country"), region: val("fs-region"), done: true }; renderEntertainment(); },
    "fs-add": (el) => { const id = el.dataset.id ?? ""; const dp = FRIEND_DIR.find((x) => x.id === id); if (dp) { const r = requestFriend(dp.name); if (r && r.ok && r.already && r.status === "friend") { toast("Đã là bạn bè của bạn"); renderEntertainment(); return; } } if (!state.invited.includes(id)) state.invited.push(id); commit(); renderEntertainment(); toast("Đã gửi lời mời kết bạn!"); },
    "ctask-claim": (el) => {
      const t = (state.customTasks || []).find((x) => x.id === el.dataset.id); if (!t) return;
      const go = () => { ui.proofTask = t.id; openModal(proofModal); };
      if (t.money > 0 && needContact("bank", go)) return;
      go();
    },
    "ctask-sent": () => {
      const t = (state.customTasks || []).find((x) => x.id === ui.proofTask); if (!t) return;
      const c = contact();
      (state.taskClaims = state.taskClaims || []).unshift({ id: uid("cl"), taskId: t.id, uid: userId(), title: t.title, ts: Date.now(), status: "sent", bank: t.money ? { bank: c.bank, bankName: c.bankName, holder: c.holder } : null });
      commit(); closeModal(); renderTasks(); toast("Đã ghi nhận, chờ máy chủ xử lý");
    },
    "task-grant": (el) => {
      if (!isAdmin()) return;
      const id = (el.dataset.uid || val("tg-id") || "").trim(), tid = el.dataset.task || val("tg-task");
      const t = (state.customTasks || []).find((x) => x.id === tid);
      if (!t || !/^WIND-.+/.test(id)) { toast("Chọn nhiệm vụ và nhập ID dạng WIND-tên"); return; }
      const cl = (state.taskClaims || []).find((c) => c.uid === id && c.taskId === tid);
      if (cl) cl.status = "granted";
      else (state.taskClaims = state.taskClaims || []).unshift({ id: uid("cl"), taskId: tid, uid: id, title: t.title, ts: Date.now(), status: "granted", bank: null });
      creditTo(id, t.xu, t.chips, "Thưởng nhiệm vụ: " + t.title);
      if (t.money) { const b = (cl && cl.bank) || {}; (state.payouts = state.payouts || []).unshift({ id: uid("po"), ts: Date.now(), uid: id, title: t.title, money: t.money, cur: t.cur, bank: b.bank, bankName: b.bankName, holder: b.holder, status: "pending" }); }
      commit(); renderTasks(); toast("Đã cộng thưởng cho " + id);
    },
    "open-product": (el) => { ui.prod = { id: el.dataset.id ?? "", qty: 1 }; openModal(productModal); },
    "prod-qty": (el) => { const v = ui.prod; if (!v) return; v.qty = Math.max(1, Math.min(99, (v.qty || 1) + Number(el.dataset.d || 0))); refreshModal(); },
    "prod-add": () => { if (addProdToCart()) { toast("Đã thêm vào giỏ hàng!"); closeModal(); } },
    "prod-buy": () => { if (addProdToCart() && !needContact(cartHasDoc() ? "shipdoc" : "ship", () => openModal(payModal))) openModal(payModal); },
    "pay-cur": (el) => {
      const c = el.dataset.cur, k = el.dataset.kind; if (!CURRENCIES[c]) return;
      if (k === "topup") { const t = topupState(); t.amt = convertTopupAmt(t.cur, c, t.amt); t.cur = c; }
      else { state.settings.currency = c; commit(); }
      refreshModal();
    },
    "open-cart": () => openModal(cartModal, true),
    "cart-inc": (el) => {
      const id = el.dataset.id ?? "";
      state.cart[id] = (state.cart[id] ?? 0) + 1;
      commit();
      refreshModal();
    },
    "cart-dec": (el) => {
      const id = el.dataset.id ?? "";
      const n = (state.cart[id] ?? 0) - 1;
      if (n <= 0) delete state.cart[id];
      else state.cart[id] = n;
      commit();
      refreshModal();
    },
    "cart-clear": () => {
      state.cart = {};
      commit();
      refreshModal();
    },
    "set-currency": (el) => {
      const cur = el.dataset.cur;
      if (!(cur in CURRENCIES)) return;
      state.settings.currency = cur;
      commit();
    },
    checkout: () => { { const _c = state.settings.currency; if (cartCount() > 0 && cartTotal() < MINPAY[_c]) { toast("Thanh toán tối thiểu " + money(MINPAY[_c], _c)); return; } }
      if (cartCount() > 0 && needContact(cartHasDoc() ? "shipdoc" : "ship", () => openModal(payModal))) return;
      if (cartCount() === 0) {
        toast("Gi\u1ECF h\xE0ng \u0111ang tr\u1ED1ng");
        return;
      }
      openModal(payModal);
    },
    "pay-order": () => {
      const total = cartTotal();
      const count = cartCount();
      if (count === 0) {
        toast("Gi\u1ECF h\xE0ng \u0111ang tr\u1ED1ng");
        closeModal();
        return;
      }
      const cur = state.settings.currency;
      const entries = Object.keys(state.cart);
      const summary = entries.length === 1 ? `${PRODUCTS.find((p) => p.id === entries[0])?.name ?? "S\u1EA3n ph\u1EA9m"}${count > 1 ? ` x${count}` : ""}` : `${count} s\u1EA3n ph\u1EA9m WIND Store`;
      const code = payCode("payCode");
      const items = Object.assign({}, state.cart);
      const lines = entries.map((id) => { const p = PRODUCTS.find((x) => x.id === id) || {}; return { name: p.name || id, qty: state.cart[id], plan: p.plan || "", lang: p.lang || "", xu: p.rewardXu || 0, chips: p.rewardChips || 0, doc: p.cat === "study" && !p.plan, docCode: p.docOf || "" }; });
      const order = { id: uid("od"), ts: Date.now(), summary, total, currency: cur, method: val("pay-method") || CURRENCIES[cur].methods[0], status: "pending", code, items, kind: "store", lines, ref: state.referredBy || "", uid: userId(), contact: ctSnap() };
      state.orders.unshift(order);
      if (state.orders.length > 30) state.orders.length = 30;
      state.cart = {};
      ui.payCode = null;
      ui.pendingOrder = order;
      commit();
      openModal(pendingModal);
    },
    /* ---- entertainment ---- */
    "find-match": () => {
      ui.match.searched = true;
      renderEntertainment();
    },
    invite: (el) => {
      const id = el.dataset.id ?? "";
      if (!state.invited.includes(id)) state.invited.push(id);
      commit();
      toast("\u0110\xE3 g\u1EEDi l\u1EDDi m\u1EDDi h\u1ECDc c\xF9ng!");
    },
    "radio-track": async (el) => {
      const i = TRACKS.findIndex((t) => t.id === el.dataset.id);
      if (i < 0) return;
      await pickTrack(i);
      if (!isPlaying() && state.settings.sound && isSupported()) { setVolume(ui.volume / 100); await start(); renderEntertainment(); }
      toast(`${TRACKS[trackIdx].emoji} ${TRACKS[trackIdx].name}`);
    },
    "radio-next": async () => { await pickTrack(trackIdx + 1); },
    "radio-prev": async () => { await pickTrack(trackIdx - 1); },
    "toggle-radio": async () => {
      if (!isSupported()) { toast("Trình duyệt không hỗ trợ phát nhạc"); return; }
      if (isPlaying()) { stop(); toast("Đã tạm dừng Lofi Radio"); }
      else if (!state.settings.sound) { toast("Âm thanh đang tắt trong Cài đặt"); return; }
      else { setVolume(ui.volume / 100); await start(); toast(`${TRACKS[trackIdx].emoji} ${TRACKS[trackIdx].name}`); }
      renderEntertainment();
    },
    "open-tool": (el) => openTool(el.dataset.tool ?? ""),
    /* ---- utilities ---- */
    "util-cat": (el) => {
      ui.utilCat = el.dataset.cat ?? "all";
      renderUtilities();
    },
    "open-listing": (el) => openListing(el.dataset.id ?? ""),
    "open-post-listing": () => openModal(postListingModal),
    "open-category": () => {
      if (state.customCats.length >= 8) {
        toast("B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 t\u1EA1o t\u1ED1i \u0111a 8 danh m\u1EE5c");
        return;
      }
      openModal(categoryModal);
    },
    "submit-category": () => {
      const name = val("cat-name").replace(/\s+/g, " ");
      if (name.length < 2) {
        toast("T\xEAn danh m\u1EE5c c\u1EA7n t\u1ED1i thi\u1EC3u 2 k\xFD t\u1EF1");
        return;
      }
      const taken = ["cho do cu", "viec lam", "phong tro", "tat ca", "nhiem vu", "tien ich khac", "tai lieu"];
      const key = norm(name);
      if (taken.some((t) => key.includes(t)) || state.customCats.some((c) => norm(c.name) === key)) {
        toast("T\xEAn danh m\u1EE5c \u0111\xE3 t\u1ED3n t\u1EA1i ho\u1EB7c tr\xF9ng danh m\u1EE5c c\xF3 s\u1EB5n");
        return;
      }
      const emoji = $('input[name="cat-emoji"]:checked')?.value ?? "\u{1F4CC}";
      const id = uid("cat");
      state.customCats.push({ id, name, emoji });
      ui.utilCat = id;
      commit();
      closeModal();
      toast(`\u0110\xE3 t\u1EA1o danh m\u1EE5c "${name}"`);
    },
    "delete-category": (el) => {
      const c = state.customCats.find((x) => x.id === el.dataset.id);
      if (!c) return;
      if (!window.confirm(`X\xF3a danh m\u1EE5c "${c.name}" v\xE0 to\xE0n b\u1ED9 tin trong danh m\u1EE5c n\xE0y?`)) return;
      state.customCats = state.customCats.filter((x) => x.id !== c.id);
      state.listings = state.listings.filter((l) => l.cat !== c.id);
      ui.utilCat = "all";
      commit();
      toast("\u0110\xE3 x\xF3a danh m\u1EE5c");
    },
    "open-moderation": () => { if (!isAdmin()) { toast("Chỉ BigBoss mới mở được khu kiểm duyệt."); return; } openModal(moderationModal); },
    "approve-content": (el) => {
      if (!isAdmin()) { toast("Chỉ BigBoss mới được duyệt nội dung."); return; }
      const type = el.dataset.type; const id = el.dataset.id;
      const list = type === "post" ? state.posts : state.listings;
      const item = list.find((x) => x.id === id); if (!item) return;
      item.status = "approved"; commit(); refreshModal(); toast("Đã duyệt nội dung và cho phép hiển thị.");
    },
    "reject-content": (el) => {
      if (!isAdmin()) { toast("Chỉ BigBoss mới được từ chối nội dung."); return; }
      const type = el.dataset.type; const id = el.dataset.id;
      const list = type === "post" ? state.posts : state.listings;
      const item = list.find((x) => x.id === id); if (!item) return;
      item.status = "rejected"; commit(); refreshModal(); toast("Đã từ chối nội dung.");
    },
    "submit-listing": () => {
      const picked = val("pl-cat") || "market";
      const cat = LISTING_EMOJI[picked] || state.customCats.some((c) => c.id === picked) ? picked : "market";
      const title = val("pl-title");
      const price = val("pl-price");
      const loc = val("pl-loc");
      if (title.length < 5) {
        toast("Ti\xEAu \u0111\u1EC1 c\u1EA7n t\u1ED1i thi\u1EC3u 5 k\xFD t\u1EF1");
        return;
      }
      if (!price) {
        toast("Vui l\xF2ng nh\u1EADp gi\xE1 ho\u1EB7c m\u1EE9c l\u01B0\u01A1ng");
        return;
      }
      if (!loc) {
        toast("Vui l\xF2ng nh\u1EADp khu v\u1EF1c");
        return;
      }
      const l = { id: uid("l"), cat, title, price, loc, country: val("pl-country") || "Việt Nam", region: val("pl-region"), sid: userId(), ts: Date.now(), desc: val("pl-desc") || "Ch\u01B0a c\xF3 m\xF4 t\u1EA3 chi ti\u1EBFt.", seller: state.userName, emoji: LISTING_EMOJI[cat] ?? state.customCats.find((c) => c.id === cat)?.emoji ?? "\u{1F4CC}", status: "pending" };
      state.listings.unshift(l);
      ui.utilCat = cat;
      commit();
      closeModal();
      toast("Tin đăng đã gửi và đang chờ chủ quản kiểm duyệt trước khi hiển thị.");
    },
    "contact-seller": (el) => {
      const l = state.listings.find((x) => x.id === el.dataset.id);
      if (!l) return;
      if (l.seller === state.userName) {
        toast("\u0110\xE2y l\xE0 tin do b\u1EA1n \u0111\u0103ng");
        return;
      }
      notify("\u{1F4E8}", `\u0110\xE3 g\u1EEDi y\xEAu c\u1EA7u li\xEAn h\u1EC7 t\u1EDBi ${l.seller} v\u1EC1 "${l.title}"`);
      commit();
      toast(`\u0110\xE3 g\u1EEDi y\xEAu c\u1EA7u li\xEAn h\u1EC7 t\u1EDBi ${l.seller}`);
    },
    "save-listing": (el) => {
      const id = el.dataset.id ?? "";
      state.saved = state.saved.includes(id) ? state.saved.filter((x) => x !== id) : [...state.saved, id];
      commit();
      refreshModal();
    },
    "delete-listing": (el) => {
      const id = el.dataset.id ?? "";
      state.listings = state.listings.filter((l) => l.id !== id);
      state.saved = state.saved.filter((x) => x !== id);
      commit();
      closeModal();
      toast("\u0110\xE3 g\u1EE1 tin");
    },
    "claim-task": (el) => {
      const t = tasks().find((x) => x.id === el.dataset.id);
      if (!t || state.daily.claimed.includes(t.id) || t.progress() < t.goal) return;
      state.daily.claimed.push(t.id);
      earn(t.reward, `Th\u01B0\u1EDFng nhi\u1EC7m v\u1EE5: ${t.title}`);
      if (t.chips) { state.chips = Number(state.chips || 0) + t.chips; notify("🎰", `Thưởng nhiệm vụ: +${fmt(t.chips)} chip game`); }
      commit();
      toast(`Nhận +${fmt(t.reward)} Xu${t.chips ? " + " + fmt(t.chips) + " chip" : ""}!`);
    },
    "check-in": () => {
      if (!checkIn()) {
        toast("H\xF4m nay b\u1EA1n \u0111\xE3 \u0111i\u1EC3m danh r\u1ED3i");
        return;
      }
      commit();
      toast(`\u0110i\u1EC3m danh th\xE0nh c\xF4ng! Chu\u1ED7i ${state.streak} ng\xE0y`);
    },
    "download-doc": (el) => {
      const code = el.dataset.code ?? "en";
      if (!state.owned.includes("doc-" + code)) {
        toast("Hãy mua tài liệu trước khi tải");
        return;
      }
      downloadDoc(code);
    },
    "buy-doc": (el) => { if (!state.owned.includes("doc-" + (el.dataset.code ?? "en")) && needContact("doc", () => { closeModal(); actions["buy-doc"](el); })) return;
      const code = el.dataset.code ?? "en";
      const l = langByCode(code);
      if (state.owned.includes("doc-" + code)) return;
      if (!requireFunds(DOC_PRICE)) return;
      spend(DOC_PRICE, `Mua t\xE0i li\u1EC7u ${l.name}`);
      state.owned.push("doc-" + code);
      notify("\u{1F4DA}", `B\u1EA1n \u0111\xE3 mua t\xE0i li\u1EC7u ${l.name}, b\u1EA5m T\u1EA3i v\u1EC1 \u0111\u1EC3 l\u01B0u file.`);
      commit();
      toast(`\u0110\xE3 mua t\xE0i li\u1EC7u ${l.name}!`);
    },
    /* ---- tools ---- */
    "pomo-toggle": () => {
      ui.pomo.running = !ui.pomo.running;
      refreshModal();
    },
    "pomo-reset": () => {
      ui.pomo.running = false;
      ui.pomo.mode = "focus";
      ui.pomo.remaining = 25 * 60;
      refreshModal();
    },
    "add-reminder": () => {
      const text = val("rm-text");
      if (!text) {
        toast("H\xE3y nh\u1EADp n\u1ED9i dung nh\u1EAFc nh\u1EDF");
        return;
      }
      state.reminders.push({ id: uid("rm"), text, when: val("rm-when"), done: false });
      commit();
      refreshModal();
    },
    "delete-reminder": (el) => {
      state.reminders = state.reminders.filter((r) => r.id !== el.dataset.id);
      commit();
      refreshModal();
    },
    "gpa-add": () => {
      gpaRows.push({ score: "", credit: "" });
      refreshModal();
    },
    "gpa-calc": () => {
      let sumW = 0, sumC = 0, sum4 = 0;
      for (const r of gpaRows) {
        const s = Number(r.score);
        const c = Number(r.credit);
        if (r.score === "" || r.credit === "" || !isFinite(s) || !isFinite(c) || s < 0 || s > 10 || c <= 0) continue;
        const g4 = s >= 8.5 ? 4 : s >= 7 ? 3 : s >= 5.5 ? 2 : s >= 4 ? 1 : 0;
        sumW += s * c;
        sum4 += g4 * c;
        sumC += c;
      }
      setGpaResult(sumC === 0 ? "H\xE3y nh\u1EADp \xEDt nh\u1EA5t m\u1ED9t m\xF4n h\u1EE3p l\u1EC7 (\u0111i\u1EC3m 0 \u2013 10, t\xEDn ch\u1EC9 l\u1EDBn h\u01A1n 0)." : `GPA thang 10: <b>${(sumW / sumC).toFixed(2)}</b> \u2022 Thang 4 (quy \u0111\u1ED5i tham kh\u1EA3o): <b>${(sum4 / sumC).toFixed(2)}</b> \u2022 T\u1ED5ng ${sumC} t\xEDn ch\u1EC9`);
      refreshModal();
    },
    /* ---- community ---- */
    "publish-post": () => {
      const text = ui.draft.trim();
      if (text.length < 3) {
        toast("B\xE0i vi\u1EBFt c\u1EA7n t\u1ED1i thi\u1EC3u 3 k\xFD t\u1EF1");
        return;
      }
      const adm = isAdmin();
      state.posts.unshift({ id: uid("po"), author: state.userName, tag: ui.draftTag, text, ts: Date.now(), likes: 0, liked: false, comments: [], status: adm ? "approved" : "pending", admin: adm || undefined });
      ui.draft = "";
      state.daily.posts += 1;
      commit();
      if (adm) { admBurst(); toast("👑 Máy chủ đã đăng bài, hiển thị ngay cho mọi người."); }
      else toast("Bài viết đã gửi và đang chờ chủ quản kiểm duyệt trước khi hiển thị công khai.");
    },
    "like-post": (el) => {
      const p = state.posts.find((x) => x.id === el.dataset.id);
      if (!p) return;
      p.liked = !p.liked;
      p.likes += p.liked ? 1 : -1;
      commit();
    },
    "toggle-comments": (el) => {
      const id = el.dataset.id ?? "";
      if (ui.openComments.has(id)) ui.openComments.delete(id);
      else ui.openComments.add(id);
      renderCommunity();
    },
    "send-comment": (el) => {
      const id = el.dataset.id ?? "";
      const text = val(`cmt-${id}`);
      const p = state.posts.find((x) => x.id === id);
      if (!p || !text) {
        toast("H\xE3y nh\u1EADp n\u1ED9i dung b\xECnh lu\u1EADn");
        return;
      }
      p.comments.push({ id: uid("c"), author: state.userName, text, ts: Date.now() });
      commit();
    },
    "delete-post": (el) => {
      state.posts = state.posts.filter((p) => p.id !== el.dataset.id);
      commit();
      toast("\u0110\xE3 x\xF3a b\xE0i vi\u1EBFt");
    },
    /* ---- wallet ---- */
    "choose-store-currency": (el) => {
      const cur = el.dataset.currency;
      if (!CURRENCIES[cur]) return;
      state.settings.currency = cur;
      commit();
      toast(`WIND Store: ${CURRENCIES[cur].name}`);
    },
    "choose-sfx": (el) => {
      const side = el.dataset.side;
      const preset = el.dataset.preset;
      if (!["right", "wrong"].includes(side) || !["1", "2", "3"].includes(preset)) return;
      localStorage.setItem(`windtp-sfx-${side}`, preset);
      sfx(`${side}-preview-${preset}`);
      refreshModal();
    },
    "claim-referral-commission": () => {
      const pending = Math.max(0, Number(state.referralCommission || 0));
      if (!pending) {
        toast("Chưa có thưởng WIND Coin chờ nhận.");
        return;
      }
      state.balance += pending;
      state.history.unshift({ id: uid("tx"), title: "Thưởng mời bạn mua khóa học", amount: pending, kind: "in", ts: Date.now() });
      state.referralCommission = 0;
      commit();
      toast(`Đã nhận ${fmt(pending)} WIND Coin thưởng mời bạn.`);
    },
    "referral-link": async () => {
      const code = userId();
      let base = "";
      try { base = window.WINDTP && window.WINDTP.appUrl ? window.WINDTP.appUrl() : ""; } catch (e) { }
      if (!base) base = location.href.split(/[?#]/)[0];
      const link = `${base.split(/[?#]/)[0]}?ref=${encodeURIComponent(code)}`;
      let copied = false;
      try { await navigator.clipboard.writeText(link); copied = true; } catch (e) { }
      if (!copied) { try { const ta = document.createElement("textarea"); ta.value = link; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:0;top:0;opacity:0"; document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, link.length); copied = document.execCommand("copy"); ta.remove(); } catch (e) { } }
      if (copied) toast("Đã sao chép liên kết mời bạn bè.");
      else if (navigator.share) { try { await navigator.share({ title: "WINDTP", text: "Học cùng mình trên WINDTP nhé!", url: link }); } catch (e) { } }
      else window.prompt("Sao chép liên kết mời bạn bè:", link);
    },
    "spend-xu": () => {
      ui.shopCat = "study";
      ui.shopSub = "Tài liệu";
      ui.shopPay = "xu";
      ui.shopQuery = "";
      goTo("shop");
    },
    "open-topup": () => openTopup(),
    "topup-cur": (el) => { const t = topupState(), c = el.dataset.cur; if (!CURRENCIES[c]) return; t.amt = convertTopupAmt(t.cur, c, t.amt); t.cur = c; refreshModal(); },
    "topup-amt": (el) => { topupState().amt = Number(el.dataset.amt); refreshModal(); },
    "topup-next": () => {
      const t = topupState(), xu = topupXu(t.cur, t.amt);
      if (!(Number(t.amt) > 0) || !Number.isInteger(Number(t.amt))) { toast("Vui l\xF2ng nh\u1EADp s\u1ED1 ti\u1EC1n h\u1EE3p l\u1EC7"); return; }
      if (Number(t.amt) < MINPAY[t.cur]) { toast("Thanh toán tối thiểu " + money(MINPAY[t.cur], t.cur)); return; }
      if (xu > 5e7) { toast("M\u1ED7i l\u1EA7n n\u1EA1p t\u1ED1i \u0111a 50,000,000 Xu"); return; }
      t.step = 2; refreshModal();
    },
    "topup-back": () => { topupState().step = 1; refreshModal(); },
    "open-fb": () => { const w = window.open(FB_PAGE, "_blank", "noopener,noreferrer"); if (!w) { try { window.top.location.href = FB_PAGE; } catch (e) { window.location.href = FB_PAGE; } } },
    "submit-topup": () => {
      const t = topupState(), xu = topupXu(t.cur, t.amt), code = payCode("topupCode");
      const order = { id: uid("od"), ts: Date.now(), summary: (t.src === "chip" ? "Mua " + fmt(xu) + " chip trong game" : t.src === "game" ? "Mua " + fmt(xu) + " xu trong game" : `N\u1EA1p ${fmt(xu)} Xu`), total: Number(t.amt), currency: t.cur, method: val("pay-method") || CURRENCIES[t.cur].methods[0], status: "pending", code, kind: "topup", xu: t.src === "chip" ? 0 : xu, chips: t.src === "chip" ? xu : 0, src: t.src || "", uid: userId() };
      state.orders.unshift(order);
      if (state.orders.length > 30) state.orders.length = 30;
      ui.topup = null; ui.topupCode = null; ui.pendingOrder = order;
      commit();
      openModal(pendingModal);
    },
    "history-filter": (el) => {
      ui.historyFilter = el.dataset.f ?? "all";
      renderTab("wallet");
    },
    /* ---- settings / profile ---- */
    "open-profile": () => { ui.profileTab = "avatar"; ui.avatarCategory = "streak"; openModal(profileModal); },
    "profile-tab": (el) => {
      ui.profileTab = el.dataset.t === "frame" ? "frame" : "avatar";
      if (ui.profileTab === "avatar") ui.avatarCategory = "streak";
      refreshModal();
    },
    "avatar-category": (el) => {
      ui.avatarCategory = ["all","zodiac","chinese","age","streak","special"].includes(el.dataset.cat) ? el.dataset.cat : "all";
      refreshModal();
    },
    "equip-cosmetic": (el) => {
      const kind = el.dataset.kind === "frame" ? "frame" : "avatar";
      const id = el.dataset.id ?? "";
      if (!isOwned(kind, id)) {
        const it = kind === "avatar" ? avatarById(id) : frameById(id);
        if (it.unlock === "admin") toast("Ch\u1EC9 m\u00E1y ch\u1EE7 (BigBoss) m\u1EDBi d\u00F9ng \u0111\u01B0\u1EE3c m\u1EE5c n\u00E0y.");
        return;
      }
      if (kind === "avatar") state.avatarId = id;
      else { state.frameId = id; state.frameNone = id === "none"; }
      commit();
      refreshModal();
    },
    "admin-equip-set": () => {
      if (!isAdmin()) { toast("Ch\u1EC9 m\u00E1y ch\u1EE7 (BigBoss) m\u1EDBi d\u00F9ng \u0111\u01B0\u1EE3c b\u1ED9 n\u00E0y."); return; }
      state.avatarId = ADMIN_AVATAR_ID;
      state.frameId = ADMIN_FRAME_ID;
      commit();
      refreshModal();
      admBurst();
      toast("\u{1F451} \u0110\u00E3 d\u00F9ng Logo WINDTP + khung Ho\u00E0ng Kim Thi\u00EAn \u0110\u1EBF");
    },
    "buy-cosmetic": (el) => {
      const kind = el.dataset.kind === "frame" ? "frame" : "avatar";
      const id = el.dataset.id ?? "";
      const item = kind === "avatar" ? avatarById(id) : frameById(id);
      if (item.unlock !== "buy" || isOwned(kind, id)) return;
      if (!requireFunds(item.price)) return;
      spend(item.price, `Mua ${kind === "avatar" ? "avatar" : "khung avatar"} ${esc(item.name)}`);
      if (kind === "avatar") {
        state.ownedAvatars.push(id);
        state.avatarId = id;
      } else {
        state.ownedFrames.push(id);
        state.frameId = id;
      }
      notify("\u{1F5BC}\uFE0F", `B\u1EA1n \u0111\xE3 mua ${kind === "avatar" ? "avatar" : "khung"} ${esc(item.name)}`);
      commit();
      refreshModal();
      toast(`\u0110\xE3 mua v\xE0 \u0111ang d\xF9ng ${esc(item.name)}!`);
    },
    "claim-cosmetic": (el) => {
      const kind = el.dataset.kind === "frame" ? "frame" : "avatar";
      const id = el.dataset.id ?? "";
      const item = kind === "avatar" ? avatarById(id) : frameById(id);
      if (!["streak7","streak15","streak30"].includes(item.unlock) || isOwned(kind, id)) return;
      const need = item.rewardDays || 7;
      if (streakProgress() < need) {
        toast(`Cần đăng nhập + điểm danh ${need} ngày liên tiếp (hiện ${streakProgress()})`);
        return;
      }
      if (kind === "avatar") {
        state.ownedAvatars.push(id);
        state.avatarId = id;
      } else {
        state.ownedFrames.push(id);
        state.frameId = id;
      }
      notify("\u{1F381}", `Ph\u1EA7n th\u01B0\u1EDFng \u0111\u0103ng nh\u1EADp ${STREAK_DAYS} ng\xE0y: ${esc(item.name)}`);
      commit();
      sfx("coin");
      refreshModal();
      toast(`\u0110\xE3 nh\u1EADn ${esc(item.name)}!`);
    },
    "reset-data": () => {
      if (!window.confirm("\u0110\u1EB7t l\u1EA1i to\xE0n b\u1ED9 d\u1EEF li\u1EC7u demo v\u1EC1 ban \u0111\u1EA7u?")) return;
      stop();
      resetAll();
      applyTheme();
      closeModal();
      toast("\u0110\xE3 \u0111\u1EB7t l\u1EA1i d\u1EEF li\u1EC7u");
    }
  };
  var inputs = {
    shopq: (el) => {
      ui.shopQuery = el.value;
      renderShopGrid();
    },
    draft: (el) => {
      ui.draft = el.value;
    },
    volume: (el) => {
      ui.volume = Number(el.value);
      setVolume(ui.volume / 100);
    }
  };
  var changes = {
    "shop-sort": (el) => {
      ui.shopSort = el.value;
      renderTab("shop");
    },
    "match-lang": (el) => {
      ui.match.lang = el.value;
      ui.match.searched = false;
    },
    "match-level": (el) => {
      ui.match.level = Number(el.value);
      ui.match.searched = false;
    },
    "match-goal": (el) => {
      ui.match.goal = el.value;
      ui.match.searched = false;
    },
    "draft-tag": (el) => {
      ui.draftTag = el.value;
    },
    setting: (el) => {
      const key = el.dataset.key;
      state.settings[key] = el.checked;
      if (key === "dark" || key === "sfx") applyTheme();
      if (key === "sfx" && el.checked) sfx("toggle");
      if (key === "sound" && !el.checked && isPlaying()) stop();
      commit();
    },
    gender: (el) => { const v = el.value; state.settings.gender = ["nam", "nu", "khac"].includes(v) ? v : ""; commit(); refreshModal(); if (v) toast("Đã lưu giới tính"); },
    birth: (el) => {
      if (state.settings.birth && ui.birthEdit !== 2) { el.value = state.settings.birth; return; }
      const v = el.value;
      if (!v) { ui.birthPending = ""; refreshModal(); return; }
      const a = ageFromBirth(v);
      if (a < 0 || a > 120) { toast("Ngày sinh không hợp lệ"); el.value = ""; ui.birthPending = ""; refreshModal(); return; }
      ui.birthPending = v; refreshModal();
    },
    "topup-custom": (el) => { const v = Number(el.value); if (v > 0) { topupState().amt = Math.floor(v); refreshModal(); } },
    currency: (el) => {
      if (el.value === "VND" || el.value === "KRW" || el.value === "JPY") state.settings.currency = el.value;
      commit();
      refreshModal();
    },
    name: (el) => {
      const v = el.value.trim();
      if (v) state.userName = v.slice(0, 30);
      else el.value = state.userName;
      commit();
    },
    "toggle-reminder": (el) => {
      const r = state.reminders.find((x) => x.id === el.dataset.id);
      if (r) r.done = el.checked;
      commit();
      refreshModal();
    }
  };
  function wireEvents() {
    document.addEventListener("click", (ev) => {
      const target = ev.target;
      const clickable = target.closest('button, [data-action], [role="button"], input[type="checkbox"], input[type="radio"], label');
      if (clickable && !clickable.hasAttribute("disabled")) sfx("click");
      if (target.matches("[data-modal-bg]")) {
        closeModal();
        return;
      }
      const el = target.closest("[data-action]");
      if (el && !el.hasAttribute("disabled")) {
        const fn = actions[el.dataset.action ?? ""];
        if (fn) {
          const r = fn(el, ev);
          if (r instanceof Promise) r.catch(() => toast("C\xF3 l\u1ED7i x\u1EA3y ra, vui l\xF2ng th\u1EED l\u1EA1i"));
        }
        return;
      }
      if (!target.closest("#notice-panel, #search-panel, #main-header")) closePanels(true);
    });
    document.addEventListener("input", (ev) => {
      const el = ev.target;
      if (el.id === "search-input" || el.id === "search-input-m") {
        const other = $(el.id === "search-input" ? "#search-input-m" : "#search-input");
        if (other) other.value = el.value;
        renderSearch(el.value);
        return;
      }
      const key = el.dataset.input;
      if (key && inputs[key]) inputs[key](el);
      if (el.dataset.gpa) {
        const row = gpaRows[Number(el.dataset.i)];
        if (row) row[el.dataset.gpa] = el.value;
      }
    });
    document.addEventListener("change", (ev) => {
      const el = ev.target;
      const key = el.dataset.change;
      if (key && changes[key]) changes[key](el);
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        if (ui.renderModal) closeModal();
        closePanels(true);
        return;
      }
      if (ev.key === "Enter" && ev.target.id === "qz-write") {
        ev.preventDefault();
        actions["quiz-write"](ev.target, ev);
        return;
      }
      if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches('[role="button"][data-action]')) {
        ev.preventDefault();
        ev.target.click();
      }
    });
    window.addEventListener("popstate", () => {
      const t = location.hash.replace("#/", "");
      goTo(isTab(t) ? t : "home", void 0, false);
    });
  }
  function wireBannerSwipe() {
    let sx = 0, dx = 0, drag = false, moved = false, wrap = null;
    const slider = () => $("#banner-slider");
    document.addEventListener("pointerdown", (e) => {
      const w = e.target.closest && e.target.closest("#banner-wrap");
      if (!w || (e.pointerType === "mouse" && e.button !== 0)) return;
      wrap = w; sx = e.clientX; dx = 0; drag = true; moved = false;
      ui.bannerTouch = Date.now();
    });
    document.addEventListener("pointermove", (e) => {
      if (!drag) return;
      dx = e.clientX - sx;
      if (Math.abs(dx) > 8) moved = true;
      if (!moved) return;
      ui.bannerTouch = Date.now();
      const sl = slider();
      if (sl) { sl.style.transition = "none"; sl.style.transform = `translateX(calc(-${ui.slide * 100}% + ${dx}px))`; }
    });
    const end = () => {
      if (!drag) return;
      drag = false;
      ui.bannerTouch = Date.now();
      const sl = slider();
      if (sl) sl.style.transition = "";
      const w = wrap ? wrap.offsetWidth : 300;
      if (moved && Math.abs(dx) > Math.min(60, w * 0.15)) setBanner(ui.slide + (dx < 0 ? 1 : -1));
      else setBanner(ui.slide);
    };
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
    document.addEventListener("click", (e) => { if (moved && e.target.closest && e.target.closest("#banner-wrap")) { e.stopPropagation(); e.preventDefault(); } moved = false; }, true);
  }
  function init() {
    ensureIdentity();
    if (purgeExpired()) save();
    window.setInterval(() => { if (purgeExpired()) commit(); }, 6e5);
    bootAuth();
    if (state.lang) enrichDaily(langByCode(state.lang));
    syncCustomProducts();
    applyTheme();
    rollDay();
    const fromHash = location.hash.replace("#/", "");
    if (isTab(fromHash)) ui.tab = fromHash;
    subscribe(renderAll);
    showTab(ui.tab);
    renderAll();
    setBanner(ui.slide);
    wireEvents();
    wireBannerSwipe();
    window.setInterval(() => {
      if (ui.tab === "home" && !document.hidden && !ui.renderModal && Date.now() - (ui.bannerTouch || 0) >= 1e4) setBanner(ui.slide + 1);
    }, 4500);
    window.setInterval(pomoTick, 1e3);
  }


