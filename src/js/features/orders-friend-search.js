  /* ===== v7: orders, friend search, special task proof ===== */
  function newOrderCode(kind) { const pre = kind === "topup" ? "WIND2" : kind === "game" ? "WIND3" : "WIND1"; return pre + String(Math.floor(1000 + Math.random() * 9000)); }
  function ctSnap() { const c = contact(); return { address: c.address || "", phone: c.phone || "", docEmail: c.docEmail || (state.account && state.account.email) || "" }; }
  function cartHasDoc() { return Object.keys(state.cart).some((id) => { const p = PRODUCTS.find((x) => x.id === id); return p && p.cat === "study" && !p.plan; }); }
  function purgeOld() {
    const lim = Date.now() - 7 * 864e5, n = (state.orders || []).length;
    if (n) { state.orders = state.orders.filter((o) => o.ts >= lim); if (state.orders.length !== n) save(); }
  }
  purgeOld(); subscribe(purgeOld);
  function docOrder(code) {
    const l = LANGUAGES.find((x) => x.code === code), nm = "Tài liệu " + (l ? l.name : code);
    state.orders.unshift({ id: uid("od"), ts: Date.now(), summary: nm, total: DOC_PRICE, currency: "XU", method: "WIND Coin", status: "pending", code: newOrderCode("store"), kind: "doc", uid: userId(), contact: ctSnap(), lines: [{ name: nm, qty: 1, doc: true }] });
    commit();
  }
  const _buyDoc = actions["buy-doc"];
  actions["buy-doc"] = (el) => { const had = state.owned.length; _buyDoc(el); if (state.owned.length > had) docOrder(el.dataset.code ?? "en"); };
  function amtText(o) { return o.currency === "XU" ? fmt(o.total) + " Xu" : money(o.total, o.currency); }
  function orderGrant(o) {
    const g = { xu: 0, chips: 0, courses: [], doc: false, docs: [] };
    if (o.kind === "topup") { g.xu = o.xu || 0; g.chips = o.chips || 0; }
    if (o.kind === "store") { const thr = BIG_THR[o.currency] || 1000000, big = Number(o.total) >= thr; g.xu += big ? 50000 : 10000; g.chips += big ? 50000 : 10000; g.shop = { big }; }
    (o.lines || []).forEach((l) => { g.xu += (l.xu || 0) * (l.qty || 1); g.chips += (l.chips || 0) * (l.qty || 1); if (l.plan) g.courses.push({ name: l.name, plan: l.plan, lang: l.lang }); if (l.doc) g.doc = true; if (l.docCode) g.docs.push(l.docCode); });
    return g;
  }
  function applyCredits() {
    const q = state.credits && state.credits[userId()];
    if (!q || !q.length) return;
    state.credits[userId()] = [];
    q.forEach((c) => { if (c.xu) earn(c.xu, c.note); if (c.chips) state.chips = (state.chips || 0) + c.chips; (c.courses || []).forEach((p) => grantCourse(p)); (c.docs || []).forEach((dc) => { if (!state.owned.includes("doc-" + dc)) state.owned.push("doc-" + dc); }); if (c.shop) { const cl = state.daily.claimed = state.daily.claimed || []; ["t-shop"].concat(c.shop.big ? ["t-bigshop"] : []).forEach((t) => { if (!cl.includes(t)) cl.push(t); }); state.daily.purchases = (state.daily.purchases || 0) + 1; } });
  }
  applyCredits();
  function orderCard(o, admin) {
    const c = o.contact || {}, g = orderGrant(o), done = o.status === "done";
    const list = (o.lines && o.lines.length) ? o.lines.map((l) => esc(l.name) + " x" + l.qty).join(", ") : esc(o.summary || "");
    const badge = done ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Đã xử lý</span>' : '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">Đang chờ xử lý</span>';
    const give = [g.xu ? "🪙 " + fmt(g.xu) + " Xu" : "", g.chips ? "🎰 " + fmt(g.chips) + " chip" : "", g.courses.length ? "👑 Mở khóa Premium (" + g.courses.map((x) => esc(x.name)).join(", ") + ")" : ""].filter(Boolean).join(" · ");
    const docNote = g.doc || o.kind === "doc" ? `<p class="text-[11px] font-bold text-sky-700">📨 Gửi tài liệu về ${c.address ? "địa chỉ: " + esc(c.address) + " · " : ""}Gmail: ${esc(c.docEmail || "(không có)")}</p>` : "";
    return `<div class="rounded-xl border border-slate-200 p-3 space-y-1.5"><div class="flex justify-between items-center gap-2"><p class="font-bold text-slate-800">${esc(o.code || "")} · ${amtText(o)}</p>${badge}</div>
      ${admin ? `<p class="text-[11px] text-slate-600">ID: <b>${esc(o.uid || "?")}</b></p>` : ""}
      <p class="text-[11px] text-slate-600">Sản phẩm: ${list}</p>
      ${admin && o.kind !== "topup" ? `<p class="text-[11px] text-slate-600">Địa chỉ: ${esc(c.address || "—")} · SĐT: ${esc(c.phone || "—")} · Gmail: ${esc(c.docEmail || "—")}</p>` : ""}
      ${docNote}${give && (admin || done) ? `<p class="text-[11px] font-bold text-amber-700">${done ? "Đã cộng" : "Sẽ cộng"}: ${give}</p>` : ""}
      ${admin && !done ? `<button data-action="admin-confirm" data-id="${o.id}" class="w-full ${btnPrimary}">Xác nhận đã thanh toán${give ? " và cộng thưởng" : ""}</button>` : ""}</div>`;
  }
  /* friend search */

