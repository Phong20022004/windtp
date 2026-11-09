  /* ===== v6: user ID, contact info, admin orders/credits/tasks ===== */
  function userId() { const e = (state.account && state.account.email) || ""; return e ? "WIND-" + e.split("@")[0] : "WIND-guest"; }
  function contact() { if (!state.contacts) state.contacts = {}; const k = userId(); if (!state.contacts[k]) state.contacts[k] = { address: "", phone: "", docEmail: "", bank: "", bankName: "", holder: "" }; return state.contacts[k]; }
  function contactOk(kind) {
    const c = contact();
    if (kind === "shipdoc") return contactOk("ship") && contactOk("doc");
    if (kind === "doc") return /^[a-z0-9._+-]+@gmail\.com$/i.test(c.docEmail || "");
    if (kind === "bank") return (c.bank || "").length >= 6 && (c.bankName || "").length >= 2 && (c.holder || "").length >= 2;
    return (c.address || "").trim().length >= 6 && /^[0-9+\s-]{8,15}$/.test(c.phone || "");
  }
  function needContact(kind, next) {
    if (contactOk(kind)) return false;
    ui.afterContact = { kind, next }; openModal(contactModal); return true;
  }
  var CT_LABEL = { address: "Địa chỉ nhận hàng", phone: "Số điện thoại", docEmail: "Gmail nhận tài liệu", bank: "Số tài khoản nhận tiền", bankName: "Ngân hàng", holder: "Tên chủ tài khoản" };
  function ctField(k, pre) {
    const c = contact(), v = esc(c[k] || "");
    return `<div><label class="font-bold text-slate-700" for="${pre}${k}">${CT_LABEL[k]}</label>${k === "address" ? `<textarea id="${pre}${k}" rows="2" class="${field} mt-1 resize-none">${v}</textarea>` : `<input id="${pre}${k}" value="${v}" ${k === "phone" ? 'inputmode="tel"' : ""} class="${field} mt-1">`}</div>`;
  }
  function saveContact(pre, keys) {
    const c = contact(); keys.forEach((k) => { c[k] = (val(pre + k) || "").trim(); });
    commit();
  }
  var CT_KEYS = { shipdoc: ["address", "phone", "docEmail"], ship: ["address", "phone"], doc: ["docEmail"], bank: ["bank", "bankName", "holder"] };
  var CT_WHY = { shipdoc: "Đơn có tài liệu: nhập địa chỉ, số điện thoại và Gmail để nhận. Thông tin được lưu trong Cài đặt dưới ID của bạn.", ship: "Nhập địa chỉ và số điện thoại để nhận hàng. Thông tin được lưu trong Cài đặt, dưới ID của bạn.", doc: "Nhập Gmail để nhận tài liệu sau khi mua. Gmail được lưu trong Cài đặt.", bank: "Nhiệm vụ này thưởng tiền. Nhập số tài khoản để nhận thưởng." };
  function contactModal() {
    const k = (ui.afterContact && ui.afterContact.kind) || "ship";
    return `${modalHead("Thông tin của bạn")}<div class="p-5 space-y-3 text-xs">
      <p class="text-slate-600">${CT_WHY[k]}</p>
      ${CT_KEYS[k].map((x) => ctField(x, "ct-")).join("")}
      <button data-action="contact-save" class="w-full ${btnPrimary}">Lưu và tiếp tục</button></div>`;
  }
  function validContact(kind) {
    if (kind === "shipdoc") return contactOk("shipdoc") ? "" : "Vui lòng nhập địa chỉ, số điện thoại và Gmail hợp lệ (…@gmail.com)";
    if (kind === "doc") return contactOk("doc") ? "" : "Vui lòng nhập Gmail hợp lệ (…@gmail.com)";
    if (kind === "bank") return contactOk("bank") ? "" : "Vui lòng nhập đủ số tài khoản, ngân hàng và tên chủ tài khoản";
    return contactOk("ship") ? "" : "Vui lòng nhập địa chỉ (từ 6 ký tự) và số điện thoại hợp lệ";
  }
  /* credits */
  function creditTo(id, xu, chips, note) {
    xu = Math.max(0, Math.floor(Number(xu) || 0)); chips = Math.max(0, Math.floor(Number(chips) || 0));
    if (!xu && !chips) return false;
    if (!state.credits) state.credits = {};
    (state.credits[id] = state.credits[id] || []).push({ xu, chips, note: note || "Admin cộng thưởng", ts: Date.now() });
    applyCredits(); commit(); return true;
  }
  function applyCredits() {
    const q = state.credits && state.credits[userId()];
    if (!q || !q.length) return;
    state.credits[userId()] = [];
    q.forEach((c) => { if (c.xu) earn(c.xu, c.note); if (c.chips) state.chips = (state.chips || 0) + c.chips; });
  }
  subscribe(() => { const q = state.credits && state.credits[userId()]; if (q && q.length) { applyCredits(); save(); } });
  function ordersModal() {
    const od = (state.orders || []).slice(0, 30), po = state.payouts || [];
    const row = (o) => `<div class="rounded-xl border border-slate-200 p-3 space-y-1.5">
      <p class="font-bold text-slate-800">${esc(o.summary || "")} · ${money(o.total, o.currency)}</p>
      <p class="text-[11px] text-slate-500">ID: <b>${esc(o.uid || "?")}</b> · Mã: <b>${esc(o.code || "")}</b> · ${esc(o.method || "")}</p>
      ${o.contact && o.contact.address ? `<p class="text-[11px] text-slate-500">Giao tới: ${esc(o.contact.address)} · ${esc(o.contact.phone || "")}</p>` : ""}
      ${o.status === "pending" ? `<div class="grid grid-cols-2 gap-2"><input id="ao-xu-${o.id}" inputmode="numeric" placeholder="Xu cộng" value="${o.kind === "topup" ? o.xu : ""}" class="${field}"><input id="ao-chip-${o.id}" inputmode="numeric" placeholder="Chip cộng" class="${field}"></div>
      <button data-action="admin-confirm" data-id="${o.id}" class="w-full ${btnPrimary}">Xác nhận đã thanh toán và cộng thưởng</button>` : `<p class="text-[11px] font-bold text-emerald-600">Đã xác nhận</p>`}</div>`;
    return `${modalHead("📦 Đơn thanh toán và cộng Xu")}<div class="p-5 space-y-3 text-xs">
      ${od.length ? od.map(row).join("") : '<p class="text-slate-500 text-center py-4">Chưa có đơn nào trên thiết bị này.</p>'}
      <div class="rounded-xl bg-sky-50 border border-sky-200 p-3 space-y-2"><p class="font-extrabold text-sky-900">Cộng thưởng theo ID</p>
        <input id="ac-id" placeholder="WIND-tenGmail" class="${field}"><div class="grid grid-cols-2 gap-2"><input id="ac-xu" inputmode="numeric" placeholder="Xu" class="${field}"><input id="ac-chip" inputmode="numeric" placeholder="Chip" class="${field}"></div>
        <button data-action="admin-credit" class="w-full ${btnPrimary}">Cộng thưởng</button></div>
      ${po.length ? `<p class="font-extrabold text-slate-800 pt-1">Thưởng tiền cần chuyển</p>${po.map((p) => `<div class="rounded-xl border border-amber-200 bg-amber-50 p-3"><p class="font-bold">${esc(p.title)} · ${money(p.money, p.cur)}</p><p class="text-[11px]">ID ${esc(p.uid)} · ${esc(p.bankName)} · ${esc(p.bank)} · ${esc(p.holder)}</p>${p.status === "pending" ? `<button data-action="payout-done" data-id="${p.id}" class="mt-1 ${btnGhost}">Đã chuyển tiền</button>` : '<p class="text-[11px] font-bold text-emerald-600">Đã chuyển</p>'}</div>`).join("")}` : ""}
    </div>`;
  }
  function taskModal() {
    return `${modalHead("➕ Thêm nhiệm vụ")}<div class="p-5 space-y-3 text-xs">
      <div><label class="font-bold text-slate-700" for="at-title">Tên nhiệm vụ</label><input id="at-title" maxlength="80" class="${field} mt-1"></div>
      <div><label class="font-bold text-slate-700" for="at-desc">Mô tả</label><textarea id="at-desc" rows="2" maxlength="200" class="${field} mt-1 resize-none"></textarea></div>
      <p class="font-bold text-slate-700">Mức thưởng (nhập 1 hoặc nhiều loại)</p>
      <div class="grid grid-cols-3 gap-2"><input id="at-xu" inputmode="numeric" placeholder="WIND Coin" class="${field}"><input id="at-chip" inputmode="numeric" placeholder="Chip" class="${field}"><input id="at-money" inputmode="numeric" placeholder="Tiền" class="${field}"></div>
      <select id="at-cur" class="${field}"><option>VND</option><option>KRW</option><option>JPY</option></select>
      <p class="text-[11px] text-slate-500">Nếu có thưởng tiền, người dùng phải nhập số tài khoản khi nhận.</p>
      <button data-action="task-save" class="w-full ${btnPrimary}">Đăng nhiệm vụ</button></div>`;
  }
  function customTasksHtml() {
    const list = (state.customTasks || []), done = state.customDone || [];
    const add = isAdmin() ? `<button data-action="open-task-add" class="w-full ${btnPrimary}">➕ Thêm nhiệm vụ</button>` : "";
    if (!list.length) return add ? `<div class="mt-4">${add}</div>` : "";
    return `<div class="mt-4 space-y-3"><h3 class="font-extrabold text-slate-800">Nhiệm vụ đặc biệt</h3>${add}${list.map((t) => {
      const rw = [t.xu ? `🪙 ${fmt(t.xu)} Xu` : "", t.chips ? `🎰 ${fmt(t.chips)} chip` : "", t.money ? `💵 ${money(t.money, t.cur)}` : ""].filter(Boolean).join(" · ");
      return `<div class="glass-card p-4 rounded-2xl flex items-center gap-3"><div class="flex-1 min-w-0"><p class="font-bold text-sm text-slate-800">${esc(t.title)}</p><p class="text-[11px] text-slate-500">${esc(t.desc || "")}</p><p class="text-[11px] font-bold text-amber-700 mt-1">${rw}</p></div>${done.includes(t.id) ? '<span class="text-[11px] font-bold text-emerald-600">Đã nhận</span>' : `<button data-action="ctask-claim" data-id="${t.id}" class="${btnPrimary}">Nhận thưởng</button>`}${isAdmin() ? `<button data-action="task-del" data-id="${t.id}" class="text-rose-500 text-lg" aria-label="Xóa">🗑</button>` : ""}</div>`;
    }).join("")}</div>`;
  }
  function renderTasks() { renderTasks_(); const el = $("#tab-tasks"); if (el) el.insertAdjacentHTML("beforeend", customTasksHtml()); }
  function adminSection() {
    const a = state.account || {}, c = contact();
    const ad = isAdmin() ? `<div class="grid grid-cols-2 gap-2"><button data-action="open-add-product" class="${btnPrimary}">➕ Đăng sản phẩm</button><button data-action="open-moderation" class="${btnPrimary}">🛡️ Kiểm duyệt (${pendingCount()})</button><button data-action="open-orders" class="${btnPrimary}">📦 Đơn hàng và cộng thưởng</button><button data-action="open-task-add" class="${btnPrimary}">➕ Thêm nhiệm vụ</button>${(state.hiddenProducts || []).length ? `<button data-action="pp-restore" class="${btnGhost} col-span-2">♻️ Khôi phục sản phẩm đã xóa (${state.hiddenProducts.length})</button>` : ""}</div>` : "";
    return `<div class="rounded-2xl border border-slate-200 p-3 space-y-2"><p class="font-extrabold text-slate-800">👤 Tài khoản</p>
      <p class="text-[11px] text-slate-600 break-all">${esc(a.email || "")}${isAdmin() ? ' · <b class="text-emerald-600">👑 Máy chủ</b>' : ""}</p>
      <p class="text-xs text-slate-700 flex items-center gap-2 flex-wrap">ID: <b class="tracking-wide">${esc(userId())}</b><button data-action="copy-acc" data-text="${esc(userId())}" class="px-2 py-0.5 rounded-lg bg-white border border-sky-300 text-[10px] font-bold text-sky-800">Sao chép</button></p>
      ${ad}
      <div class="space-y-2 text-xs pt-1"><p class="font-bold text-slate-700">Thông tin nhận hàng và tài liệu</p>${["address", "phone", "docEmail", "bank", "bankName", "holder"].map((k) => ctField(k, "st-")).join("")}
        <button data-action="settings-contact-save" class="w-full ${btnGhost}">Lưu thông tin</button></div>
      <button data-action="logout" class="w-full ${btnGhost}">Đăng xuất</button></div>`;
  }
  document.addEventListener("windtp-fashion", () => { ui.shopCat = "fashion"; ui.shopSub = ""; ui.shopQuery = ""; goTo("shop"); toast("Thời trang, Mỹ phẩm và Phụ kiện"); });

