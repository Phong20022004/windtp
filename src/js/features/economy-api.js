  // ===== Kinh tế do máy chủ giữ (window.WindtpApi, xem worker/ và docs/BACKEND.md) =====
  // Số dư Xu, chip, Premium, quyền sở hữu và lịch sử chỉ là BẢN SAO hiển thị lấy từ máy chủ; dữ liệu cùng tên lưu trong
  // trình duyệt bị bỏ qua (scrubEconomy). Mọi thao tác thay đổi tiền đều gọi API, trình duyệt không tự cộng hay trừ.
  var econ = { me: null, loadedAt: 0, warnedAt: 0, adminOrders: [], myOrders: [], ordersLoaded: false, pending: {} };
  var ECON_REFRESH_MS = 60000;

  function econClient() { return window.WindtpApi.client; }
  function econUnauthenticated(e) { return !!(e && e.code === "unauthenticated"); }

  /** Hiện lỗi API bằng tiếng Việt; lỗi mạng chỉ nhắc tối đa một lần mỗi 20 giây để không dồn dập. */
  function econFail(e, quiet) {
    const msg = e && e.message ? e.message : "Có lỗi xảy ra, vui lòng thử lại";
    if (quiet && Date.now() - econ.warnedAt < 20000) return;
    econ.warnedAt = Date.now();
    toast(msg);
  }

  /** Chạy một thao tác tiền tệ; chặn bấm đúp cùng một thao tác trong lúc đang chờ máy chủ. */
  async function econRun(key, work) {
    if (econ.pending[key]) return false;
    econ.pending[key] = true;
    try { return await work(); }
    catch (e) { econFail(e); return false; }
    finally { delete econ.pending[key]; }
  }

  function econApplyWallet(me) {
    econ.me = me; econ.loadedAt = Date.now();
    state.balance = me.balance;
    state.premiumUntil = Number(me.premiumUntil) || 0;
    const delta = Math.max(-me.chips, Math.min(1e9, Math.floor(Number(state.chipsDelta) || 0)));
    state.chipsDelta = delta;
    state.chips = Math.max(0, me.chips + delta);
    state.history = me.history.map((h) => ({ id: "tx-" + h.id, title: h.title, amount: Math.abs(h.delta) || h.chips, kind: h.delta > 0 || (h.delta === 0 && h.chips > 0) ? "in" : "out", ts: h.at }));
    const own = new Set(me.owned);
    state.owned = me.owned.filter((id) => !/^(avatar|frame):/.test(id) && !/^access:/.test(id));
    // Avatar/khung mua bằng Xu chỉ có khi máy chủ xác nhận; loại còn lại (mở theo cảnh giới, chuỗi ngày, Premium) giữ nguyên.
    const keepFree = (list, find) => list.filter((id) => { const it = find(id); return !(it && it.unlock === "buy"); });
    state.ownedAvatars = keepFree(state.ownedAvatars || [], avatarById).concat(me.owned.filter((id) => id.startsWith("avatar:")).map((id) => id.slice(7)));
    state.ownedFrames = keepFree(state.ownedFrames || [], frameById).concat(me.owned.filter((id) => id.startsWith("frame:")).map((id) => id.slice(6)));
    // Quyền học theo khóa do admin cấp kèm đơn; còn hiệu lực theo hạn Premium của máy chủ.
    state.courseAccess = {};
    LANGUAGES.forEach((l) => { if (own.has("access:" + l.code)) state.courseAccess[l.code] = state.premiumUntil; });
    if (me.birth) state.settings.birth = me.birth;
    // Nhiệm vụ trong ngày đã nhận (kể cả thưởng mua hàng do máy chủ cộng khi admin duyệt đơn).
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const today = me.history.filter((h) => h.at >= t0.getTime() && h.kind === "task");
    const got = (name) => today.some((h) => h.title === "Thưởng nhiệm vụ " + name);
    ["t-checkin", "t-lessons", "t-duel"].forEach((id) => { if (got(id) && !state.daily.claimed.includes(id)) state.daily.claimed.push(id); });
    if (got("shop")) { state.daily.purchases = Math.max(1, state.daily.purchases); if (!state.daily.claimed.includes("t-shop")) state.daily.claimed.push("t-shop"); }
    if (got("bigshop")) { state.daily.bigOrder = true; if (!state.daily.claimed.includes("t-bigshop")) state.daily.claimed.push("t-bigshop"); }
    commit();
  }

  /** Lấy lại ví từ máy chủ. Lỗi mạng thì giữ số liệu đang hiển thị. */
  function econRefresh(quiet) {
    if (!state.account || !window.WindtpApi) return Promise.resolve(false);
    return window.WindtpApi.wallet.refresh().then((me) => { econApplyWallet(me); econSyncBirth(me); econSocial(); return true; }, (e) => { econFail(e, quiet !== false); return false; });
  }

  /** Ngày sinh đã khai trong Cài đặt được gửi một lần; sau đó máy chủ giữ và không cho đổi. */
  function econSyncBirth(me) {
    const b = state.settings && state.settings.birth;
    if (me.birth || !b || !/^\d{4}-\d{2}-\d{2}$/.test(b) || econ.birthSent === b) return;
    econ.birthSent = b;
    econClient().setBirth(b).then(() => econRefresh(), () => { });
  }

  /** Nhiệm vụ đặc biệt (admin đăng) và trạng thái chia sẻ Facebook/nhiệm vụ của chính người dùng, đều lấy từ máy chủ. */
  function econSocial() {
    const api = econClient();
    return Promise.all([api.tasks(), api.myOrders(), api.posts(), isAdmin() ? api.admin.posts() : Promise.resolve([])]).then(([tasks, orders, posts, pending]) => {
      // Bài đăng do máy chủ giữ; lượt thích và bình luận vẫn chỉ lưu trên máy này.
      const old = new Map((state.posts || []).map((p) => [p.id, p]));
      const keep = (id) => old.get(id) || {};
      state.posts = posts.map((p) => ({ id: "s" + p.id, author: p.author, tag: p.tag, text: p.text, ts: p.at, admin: p.admin || undefined, mine: p.mine, status: "approved", likes: keep("s" + p.id).likes || 0, liked: !!keep("s" + p.id).liked, comments: keep("s" + p.id).comments || [] }))
        .concat(pending.map((p) => ({ id: "s" + p.id, author: p.author, tag: p.tag, text: p.text, ts: p.created_at, status: "pending", likes: 0, liked: false, comments: [] })));
      const me = userId();
      state.customTasks = tasks.map((t) => ({ id: t.id, title: t.title, desc: "", xu: t.xu, chips: t.chips, money: t.money, cur: t.cur, ts: 0 }));
      const st = (o) => (o.status === "approved" ? "granted" : o.status === "pending" ? "sent" : "rejected");
      state.taskClaims = orders.filter((o) => o.kind === "ctask" && o.status !== "rejected").map((o) => ({ id: "o" + o.id, taskId: String(o.code || "").slice(6), uid: me, title: o.summary || "", ts: o.at, status: st(o), bank: null }));
      state.fbShares = orders.filter((o) => o.kind === "fbshare").map((o) => { const key = String(o.code || "").slice(3).toUpperCase(); return { id: "o" + o.id, uid: me, link: o.summary || "", period: key, periodLabel: key, ts: o.at, status: st(o) }; });
      commit(); renderTasks();
    }, () => { });
  }
  function econBoot() {
    econ.me = null; econ.ordersLoaded = false;
    econRefresh(false).then(() => { if (isAdmin()) econPublishCatalog(); });
  }
  function econReset() {
    econ.me = null; econ.adminOrders = []; econ.myOrders = []; econ.ordersLoaded = false; econ.birthSent = "";
    if (window.WindtpApi) window.WindtpApi.wallet.clear();
  }
  window.setInterval(() => { if (document.visibilityState === "visible" && state.account) econRefresh(); }, ECON_REFRESH_MS);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && state.account && Date.now() - econ.loadedAt > 5000) econRefresh(); });
  window.addEventListener("online", () => econRefresh(false));

  // ----- Catalog: admin đăng bảng giá lên máy chủ; giá mua hàng bằng Xu chỉ lấy từ đây -----
  function econCatalog() {
    const items = [];
    COURSES.forEach((c) => items.push({ id: c.id, kind: "course", name: String(c.title).slice(0, 80), price: c.price }));
    LANGUAGES.forEach((l) => items.push({ id: "doc-" + l.code, kind: "doc", name: ("Tài liệu " + l.name).slice(0, 80), price: DOC_PRICE }));
    AVATARS.filter((a) => a.unlock === "buy").forEach((a) => items.push({ id: "avatar:" + a.id, kind: "avatar", name: String(a.name).slice(0, 80), price: a.price }));
    FRAMES.filter((f) => f.unlock === "buy").forEach((f) => items.push({ id: "frame:" + f.id, kind: "frame", name: String(f.name).slice(0, 80), price: f.price }));
    return items;
  }
  function econPublishCatalog() {
    return econClient().admin.putCatalog(econCatalog()).catch((e) => econFail(e, true));
  }

  // ----- Mua bằng Xu -----
  async function econBuy(itemId) {
    return econRun("buy:" + itemId, async () => {
      if (!econ.me) { await econRefresh(false); if (!econ.me) return false; }
      await econClient().purchase(itemId);
      await econRefresh(false);
      return true;
    });
  }
  function econNeedFunds(price) {
    if (!econ.me) { toast("Đang đồng bộ ví, hãy thử lại sau giây lát"); econRefresh(false); return false; }
    return requireFunds(price);
  }

  actions["buy-course"] = async (el) => {
    const c = COURSES.find((x) => x.id === el.dataset.id);
    if (!c) return;
    if (state.owned.includes(c.id)) { actions["open-course"](el, new Event("click")); return; }
    if (!econNeedFunds(c.price)) return;
    if (!(await econBuy(c.id))) return;
    notify("\u{1F393}", `Bạn đã mở khóa: ${c.title}`);
    toast("Mua khóa học thành công!");
    actions["open-course"](el, new Event("click"));
  };
  actions["buy-doc"] = async (el) => {
    const code = el.dataset.code ?? "en", key = "doc-" + code;
    if (!state.owned.includes(key) && needContact("doc", () => { closeModal(); actions["buy-doc"](el); })) return;
    const l = langByCode(code);
    if (state.owned.includes(key)) return;
    if (!econNeedFunds(DOC_PRICE)) return;
    if (!(await econBuy(key))) return;
    notify("\u{1F4DA}", `Bạn đã mua tài liệu ${l.name}, bấm Tải về để lưu file.`);
    toast(`Đã mua tài liệu ${l.name}!`);
  };
  actions["buy-cosmetic"] = async (el) => {
    const kind = el.dataset.kind === "frame" ? "frame" : "avatar";
    const id = el.dataset.id ?? "";
    const item = kind === "avatar" ? avatarById(id) : frameById(id);
    if (item.unlock !== "buy" || isOwned(kind, id)) return;
    if (!econNeedFunds(item.price)) return;
    if (!(await econBuy(kind + ":" + id))) return;
    if (kind === "avatar") state.avatarId = id; else state.frameId = id;
    notify("\u{1F5BC}️", `Bạn đã mua ${kind === "avatar" ? "avatar" : "khung"} ${item.name}`);
    commit();
    refreshModal();
    toast(`Đã mua ${item.name}!`);
  };

  // ----- Nhiệm vụ hằng ngày: phần thưởng do máy chủ quyết định, mỗi nhiệm vụ một lần mỗi ngày -----
  var SERVER_TASKS = ["t-checkin", "t-lessons", "t-duel"];
  actions["claim-task"] = async (el) => {
    const t = tasks().find((x) => x.id === el.dataset.id);
    if (!t || state.daily.claimed.includes(t.id) || t.progress() < t.goal) return;
    if (!SERVER_TASKS.includes(t.id)) { toast("Phần thưởng này được cộng tự động khi đơn hàng của bạn được xác nhận."); return; }
    const ok = await econRun("claim:" + t.id, async () => {
      try { await econClient().claim(t.id); } catch (e) { if (e && e.code === "duplicate") { await econRefresh(false); return false; } throw e; }
      await econRefresh(false);
      return true;
    });
    if (ok) toast(`Nhận +${fmt(t.reward)} Xu!`);
  };

  // ----- Chip game -----
  /** Game báo số chip mới; phần chênh so với số chip máy chủ cấp là kết quả chơi, chỉ lưu cục bộ (chip không đổi lại thành Xu). */
  function setGameChips(n) {
    if (!econ.me) return;
    n = Math.max(0, Math.floor(Number(n) || 0));
    if (n === Number(state.chips || 0)) return;
    state.chips = n;
    state.chipsDelta = Math.max(-econ.me.chips, Math.min(1e9, n - econ.me.chips));
    commit();
  }
  /** Đổi Xu sang chip qua máy chủ (kiểm tra số dư, tuổi và hạn mức ngày ở máy chủ). Trả Promise<boolean>. */
  async function exchangeChips(n) {
    n = Math.floor(Number(n) || 0);
    if (n <= 0 || !econ.me || n > state.balance) return false;
    const L = window.WINDTP.chipLimit();
    if (n > L.left) { toast(L.cap ? "Vượt giới hạn đổi chip hôm nay." : "Hãy xác nhận ngày sinh (từ 12 tuổi) trước khi đổi chip."); return false; }
    return econRun("chips", async () => {
      await econClient().exchangeChips(n);
      state.chipBuy = { d: todayIso(), n: ((state.chipBuy && state.chipBuy.d === todayIso() ? Number(state.chipBuy.n) : 0) || 0) + n };
      await econRefresh(false);
      return true;
    });
  }

  // ----- Nạp Xu và đơn mua hàng: tạo đơn chờ ở máy chủ; chỉ admin (claim đã xác thực) mới duyệt -----
  function econContact() { const c = ctSnap(); return { address: c.address, phone: c.phone, docEmail: c.docEmail }; }
  actions["submit-topup"] = async () => {
    const t = topupState(), xu = topupXu(t.cur, t.amt), code = payCode("topupCode");
    const summary = t.src === "chip" ? "Nạp " + fmt(xu) + " Xu (để đổi chip trong game)" : t.src === "game" ? "Nạp " + fmt(xu) + " Xu trong game" : `Nạp ${fmt(xu)} Xu`;
    const ok = await econRun("order", async () => {
      await econClient().createOrder({ kind: "topup", currency: t.cur, amount: Number(t.amt), code, summary });
      ui.pendingOrder = { summary, code, total: Number(t.amt), currency: t.cur };
      return true;
    });
    if (!ok) return;
    ui.topup = null; ui.topupCode = null;
    econ.ordersLoaded = false;
    openModal(pendingModal);
  };
  actions["pay-order"] = async () => {
    const total = Math.round(cartTotal()), count = cartCount();
    if (count === 0) { toast("Giỏ hàng đang trống"); closeModal(); return; }
    const cur = state.settings.currency;
    const entries = Object.keys(state.cart);
    const summary = entries.length === 1 ? `${PRODUCTS.find((p) => p.id === entries[0])?.name ?? "Sản phẩm"}${count > 1 ? ` x${count}` : ""}` : `${count} sản phẩm WIND Store`;
    const code = payCode("payCode");
    const lines = entries.map((id) => ({ id, qty: Math.min(99, Math.max(1, Math.floor(Number(state.cart[id]) || 1))) }));
    const ok = await econRun("order", async () => {
      await econClient().createOrder({ kind: "shop", currency: cur, amount: Math.max(1, total), code, summary, lines, contact: econContact() });
      ui.pendingOrder = { summary, code, total, currency: cur };
      return true;
    });
    if (!ok) return;
    state.cart = {};
    ui.payCode = null;
    econ.ordersLoaded = false;
    commit();
    openModal(pendingModal);
  };

  // ----- Danh sách đơn: người dùng xem đơn của mình, admin xem đơn chờ duyệt (đều từ máy chủ) -----
  function econLoadOrders() {
    const api = econClient();
    const job = isAdmin() ? Promise.all([api.admin.orders("pending"), api.admin.orders("approved")]).then(([p, a]) => { econ.adminOrders = p.concat(a); }) : api.myOrders().then((list) => { econ.myOrders = list; });
    return job.then(() => { econ.ordersLoaded = true; }, (e) => econFail(e));
  }
  function econOrderLines(o) { try { const v = JSON.parse(o.lines || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function econOrderContact(o) { try { return JSON.parse(o.contact || "{}") || {}; } catch (e) { return {}; } }

  /** Quyền lợi của đơn mua hàng, tính từ bảng giá/sản phẩm của CHÍNH admin (không tin con số khách gửi). */
  function econOrderGrant(o) {
    const g = { xu: 0, chips: 0, months: 0, grants: [], notes: [], docs: false, totalCheck: 0 };
    const cur = o.currency;
    if (o.kind !== "shop") return g;
    econOrderLines(o).forEach((l) => {
      const p = PRODUCTS.find((x) => x.id === l.id);
      if (!p) return;
      g.totalCheck += Number((p.price && p.price[cur]) || 0) * l.qty;
      g.xu += (p.rewardXu || 0) * l.qty;
      g.chips += (p.rewardChips || 0) * l.qty;
      if (p.plan) {
        const plan = COURSE_PLANS.find((x) => x.id === p.plan);
        if (plan) {
          g.months += (plan.life ? 1200 : plan.months) * l.qty;
          g.chips += plan.chips * l.qty;
          if (p.lang) g.grants.push("access:" + p.lang);
          g.notes.push(`${p.name}: Premium ${plan.life ? "trọn đời" : plan.months + " tháng"}`);
        }
      }
      if (p.docOf) { g.grants.push("doc-" + p.docOf); g.docs = true; }
      else if (p.cat === "study" && !p.plan) g.docs = true;
    });
    g.months = Math.min(1200, g.months);
    g.grants = Array.from(new Set(g.grants));
    return g;
  }

  function econOrderCard(o, adm) {
    const done = o.status !== "pending", c = econOrderContact(o), g = econOrderGrant(o);
    const badge = o.status === "approved" ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Đã xử lý</span>' : o.status === "rejected" ? '<span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">Đã từ chối</span>' : '<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">Đang chờ xử lý</span>';
    const paid = money(o.amount, o.currency);
    const task = o.kind === "ctask" ? (state.customTasks || []).find((x) => "ctask:" + x.id === o.code) : null;
    const give = [o.kind === "fbshare" ? "🪙 1,000 Xu" : "", task && task.xu ? "🪙 " + fmt(task.xu) + " Xu" : "", task && task.chips ? "🎰 " + fmt(task.chips) + " chip" : "", task && task.money ? "💵 " + money(task.money, task.cur) + " (chuyển khoản thủ công)" : "", o.kind === "topup" ? "🪙 " + fmt(o.xu) + " Xu" : "", g.xu ? "🪙 " + fmt(g.xu) + " Xu" : "", g.chips ? "🎰 " + fmt(g.chips) + " chip" : "", g.notes.length ? "👑 " + g.notes.map(esc).join(", ") : ""].filter(Boolean).join(" · ");
    const mismatch = adm && o.kind === "shop" && g.totalCheck > 0 && Math.round(g.totalCheck) !== Number(o.amount) ? `<p class="text-[11px] font-bold text-rose-600">⚠ Khách khai ${paid} nhưng bảng giá tính ra ${money(g.totalCheck, o.currency)}. Hãy đối chiếu tiền thật nhận được.</p>` : "";
    const who = adm ? `<p class="text-[11px] text-slate-600">Người đặt: <b>${esc(o.name || "")}</b> · ${esc(o.email || "")} · <span class="break-all">${esc(o.uid || "")}</span></p>` : "";
    const ship = adm && o.kind === "shop" ? `<p class="text-[11px] text-slate-600">Địa chỉ: ${esc(c.address || "—")} · SĐT: ${esc(c.phone || "—")} · Gmail: ${esc(c.docEmail || "—")}</p>` : "";
    const doc = adm && g.docs ? `<p class="text-[11px] font-bold text-sky-700">📨 Có tài liệu: gửi về Gmail ${esc(c.docEmail || "(không có)")}</p>` : "";
    const buttons = adm && !done ? `<div class="grid grid-cols-2 gap-2"><button data-action="admin-confirm" data-id="${o.id}" class="${btnPrimary}">Xác nhận đã thanh toán</button><button data-action="admin-reject" data-id="${o.id}" class="${btnGhost}">Từ chối</button></div>` : "";
    return `<div class="rounded-xl border border-slate-200 p-3 space-y-1.5"><div class="flex justify-between items-center gap-2"><p class="font-bold text-slate-800">${esc(o.code || "")} · ${paid}</p>${badge}</div>
      ${who}${o.kind === "fbshare" ? `<a href="${esc(o.summary || "")}" target="_blank" rel="noopener noreferrer nofollow" class="block text-[11px] text-blue-700 underline break-all">${esc(o.summary || "")}</a>` : `<p class="text-[11px] text-slate-600">${esc(o.summary || "")}</p>`}${adm && o.kind === "ctask" && c.bank ? `<p class="text-[11px] text-slate-600">Ngân hàng: ${esc(c.bankName || "")} · ${esc(c.bank)} · ${esc(c.holder || "")}</p>` : ""}${ship}${mismatch}${doc}
      ${give && (adm || done) ? `<p class="text-[11px] font-bold text-amber-700">${o.status === "approved" ? "Đã cộng" : "Sẽ cộng"}: ${give}</p>` : ""}${buttons}</div>`;
  }
  function ordersModal() {
    const adm = isAdmin(), tab = ui.ordTab || "pending";
    const all = adm ? econ.adminOrders : econ.myOrders;
    const inTab = (o, k) => (k === "pending") === (o.status === "pending");
    const list = all.filter((o) => inTab(o, tab));
    const tb = (k, t) => `<button data-action="ord-tab" data-t="${k}" class="flex-1 py-2 rounded-xl text-xs font-bold ${tab === k ? "bg-sky-600 text-white keep-white" : "bg-slate-100 text-slate-600"}">${t} (${all.filter((o) => inTab(o, k)).length})</button>`;
    const grant = adm ? `<div class="rounded-xl bg-sky-50 border border-sky-200 p-3 space-y-2"><p class="font-extrabold text-sky-900">Cộng thưởng theo email</p><input id="ac-email" type="email" placeholder="email người nhận (đã đăng nhập ít nhất một lần)" class="${field}"><div class="grid grid-cols-2 gap-2"><input id="ac-xu" inputmode="numeric" placeholder="Xu" class="${field}"><input id="ac-chip" inputmode="numeric" placeholder="Chip" class="${field}"></div><button data-action="admin-credit" class="w-full ${btnPrimary}">Cộng thưởng</button></div>` : "";
    return `${modalHead(adm ? "📦 Đơn hàng (máy chủ)" : "📋 Đơn hàng đã đặt")}<div class="p-5 space-y-3 text-xs">
      <div class="flex gap-2">${tb("pending", "Đang chờ xử lý")}${tb("done", "Đã xử lý")}</div>
      ${econ.ordersLoaded ? "" : '<p class="text-slate-500 text-center py-2">Đang tải đơn hàng…</p>'}
      ${list.length ? list.map((o) => econOrderCard(o, adm)).join("") : econ.ordersLoaded ? '<p class="text-slate-500 text-center py-4">Chưa có đơn nào.</p>' : ""}
      ${grant}</div>`;
  }
  actions["open-orders"] = () => { econ.ordersLoaded = false; openModal(ordersModal); econLoadOrders().then(() => refreshModal()); };
  actions["ord-tab"] = (el) => { ui.ordTab = el.dataset.t === "done" ? "done" : "pending"; refreshModal(); };

  actions["admin-confirm"] = async (el) => {
    if (!isAdmin()) return;
    const o = econ.adminOrders.find((x) => String(x.id) === el.dataset.id);
    if (!o || o.status !== "pending") return;
    const g = econOrderGrant(o);
    const extras = o.kind === "shop" ? { grants: g.grants, xu: g.xu, chips: g.chips, premiumMonths: g.months } : {};
    const ok = await econRun("approve:" + o.id, async () => { await econClient().admin.approveOrder(o.id, extras); return true; });
    if (!ok) return;
    toast(g.docs ? "Đã xác nhận. Nhớ gửi tài liệu cho khách." : "Đã xác nhận đơn");
    await econLoadOrders();
    refreshModal();
  };
  actions["admin-reject"] = async (el) => {
    if (!isAdmin()) return;
    const ok = await econRun("reject:" + el.dataset.id, async () => { await econClient().admin.rejectOrder(Number(el.dataset.id)); return true; });
    if (!ok) return;
    toast("Đã từ chối đơn");
    await econLoadOrders();
    refreshModal();
  };
  actions["admin-credit"] = async () => {
    if (!isAdmin()) return;
    const email = (val("ac-email") || "").trim().toLowerCase();
    const xu = Math.max(0, Math.floor(Number(val("ac-xu")) || 0)), chips = Math.max(0, Math.floor(Number(val("ac-chip")) || 0));
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) { toast("Nhập email của người nhận"); return; }
    if (!xu && !chips) { toast("Nhập số Xu hoặc chip"); return; }
    const ok = await econRun("grant", async () => {
      try { await econClient().admin.grant({ email, xu, chips, note: "Admin cộng thưởng" }); }
      catch (e) { if (e && e.code === "not-found") { toast("Không tìm thấy email này: người nhận cần đăng nhập app (đã xác minh email) ít nhất một lần"); return false; } throw e; }
      return true;
    });
    if (ok) toast("Đã cộng thưởng cho " + email);
  };

  // Hoa hồng giới thiệu cần ánh xạ ID WIND-… sang tài khoản thật nên tạm tắt (xem worker/README.md).
  function econUnavailable() { toast("Tính năng này đang được chuyển sang máy chủ, tạm thời chưa dùng được."); }
  actions["claim-referral-commission"] = econUnavailable;
  function creditTo() { econUnavailable(); return false; }

  // ----- Chia sẻ Facebook và nhiệm vụ đặc biệt: gửi lên máy chủ, admin duyệt, máy chủ tự quyết số thưởng -----
  actions["fb-submit"] = async () => {
    if (userId() === "WIND-guest") { toast("Hãy đăng nhập để làm nhiệm vụ"); return; }
    const cur = fbMine(); if (cur && cur.status !== "rejected") { toast("Bạn đã gửi link cho kỳ này rồi"); return; }
    const link = (val("fb-link") || "").trim();
    if (!FB_LINK_RE.test(link)) { toast("Link không hợp lệ. Hãy dán link bài viết từ facebook.com"); return; }
    if (!$("#fb-ok")?.checked) { toast("Hãy tích cam kết công khai và không dùng nick clone"); return; }
    const ok = await econRun("fb", async () => {
      try { await econClient().createOrder({ kind: "fbshare", link, period: fbPeriod().key.toLowerCase(), summary: link }); }
      catch (e) { if (e && e.code === "duplicate") { toast("Link này (hoặc kỳ này) đã được gửi trước đó"); return false; } throw e; }
      return true;
    });
    if (ok) { toast("Đã gửi link, chờ xác minh"); econSocial(); }
  };
  actions["fb-approve"] = actions["fb-reject"] = () => { if (isAdmin()) actions["open-orders"](); };
  actions["task-grant"] = () => { if (isAdmin()) actions["open-orders"](); };
  actions["ctask-sent"] = async () => {
    const t = (state.customTasks || []).find((x) => x.id === ui.proofTask); if (!t) return;
    const c = contact();
    const ok = await econRun("ctask:" + t.id, async () => {
      try { await econClient().createOrder({ kind: "ctask", taskId: t.id, contact: t.money ? { bank: c.bank, bankName: c.bankName, holder: c.holder } : undefined }); }
      catch (e) { if (e && e.code === "duplicate") { toast("Bạn đã gửi nhiệm vụ này rồi"); return false; } throw e; }
      return true;
    });
    if (!ok) return;
    closeModal(); toast("Đã ghi nhận, chờ xử lý"); econSocial();
  };
  /** Admin đăng/sửa/xóa nhiệm vụ: thực hiện trên danh sách hiện có rồi ghi đè lên máy chủ. */
  function econPutTasks() {
    return econClient().admin.putTasks((state.customTasks || []).map((t) => ({ id: String(t.id), title: String(t.title), xu: t.xu | 0, chips: t.chips | 0, money: t.money | 0, cur: t.cur || "VND" })))
      .then(() => econSocial(), (e) => econFail(e));
  }
  ["task-save", "task-del", "task-edit-save"].forEach((name) => {
    const orig = actions[name];
    if (typeof orig !== "function") return;
    actions[name] = (el, ev) => { if (!isAdmin()) return; orig(el, ev); econPutTasks(); };
  });

  // ----- Nội dung trả phí: bản đầy đủ chỉ lấy được từ máy chủ khi còn Premium và có khóa học -----
  var fullVocab = {};
  async function econEnsureFullVocab(code) {
    if (fullVocab[code]) return true;
    if (!econ.me) { await econRefresh(false); if (!econ.me) { toast("Cần kết nối máy chủ để mở bài học này"); return false; } }
    const ok = await econRun("vocab:" + code, async () => {
      toast("Đang tải bài học…");
      const file = await econClient().vocabContent(code);
      window.WindtpData.setVocab(code, file);
      fullVocab[code] = true;
      return true;
    });
    return !!ok;
  }

  // ----- Bài đăng cộng đồng: lưu và kiểm duyệt ở máy chủ -----
  const serverPostId = (el) => Number(String(el.dataset.id || "").replace(/^s/, ""));
  actions["publish-post"] = async () => {
    const text = (ui.draft || "").trim();
    if (text.length < 3) { toast("Bài viết cần tối thiểu 3 ký tự"); return; }
    let res = null;
    const ok = await econRun("post", async () => { res = await econClient().createPost(text, ui.draftTag || "Chung"); return true; });
    if (!ok) return;
    ui.draft = "";
    state.daily.posts += 1;
    commit();
    if (res.status === "approved") { admBurst(); toast("\u{1F451} Đã đăng bài, hiển thị ngay cho mọi người."); }
    else toast("Bài viết đã gửi và đang chờ chủ quản kiểm duyệt trước khi hiển thị công khai.");
    econSocial();
  };
  actions["delete-post"] = async (el) => {
    const ok = await econRun("delpost", async () => { await econClient().deletePost(serverPostId(el)); return true; });
    if (!ok) return;
    toast("Đã xóa bài viết"); econSocial();
  };
  actions["admin-del-post"] = async (el) => {
    if (!isAdmin() || !confirm("Xóa bài đăng này?")) return;
    const ok = await econRun("delpost", async () => { await econClient().deletePost(serverPostId(el)); return true; });
    if (ok) { toast("Đã xóa bài đăng"); econSocial(); }
  };
  ["approve-content", "reject-content"].forEach((name) => {
    const orig = actions[name], approve = name === "approve-content";
    actions[name] = async (el, ev) => {
      if (el.dataset.type !== "post") { if (orig) orig(el, ev); return; }
      if (!isAdmin()) { toast("Chỉ BigBoss mới được kiểm duyệt nội dung."); return; }
      const ok = await econRun("mod:" + el.dataset.id, async () => { const api = econClient().admin, id = serverPostId(el); await (approve ? api.approvePost(id) : api.rejectPost(id)); return true; });
      if (!ok) return;
      toast(approve ? "Đã duyệt nội dung và cho phép hiển thị." : "Đã từ chối nội dung.");
      await econSocial(); refreshModal();
    };
  });
  const openModerationOrig = actions["open-moderation"];
  actions["open-moderation"] = async (el, ev) => { if (!isAdmin()) { openModerationOrig(el, ev); return; } await econSocial().catch(() => { }); openModerationOrig(el, ev); };
