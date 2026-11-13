  // ===== Kinh tế do máy chủ giữ (window.WindtpApi, xem worker/ và docs/BACKEND.md) =====
  // Số dư Xu, chip, Premium, quyền sở hữu và lịch sử chỉ là BẢN SAO hiển thị lấy từ máy chủ; dữ liệu cùng tên lưu trong
  // trình duyệt bị bỏ qua (scrubEconomy). Mọi thao tác thay đổi tiền đều gọi API, trình duyệt không tự cộng hay trừ.
  var econ = { me: null, loadedAt: 0, warnedAt: 0, adminOrders: [], myOrders: [], ordersLoaded: false, pending: {} };
  var ECON_REFRESH_MS = 60000;

  function econClient() { return window.WindtpApi.client; }
  function econUnauthenticated(e) { return !!(e && e.code === "unauthenticated"); }

  /** Hiện lỗi API bằng tiếng Việt; lỗi mạng chỉ nhắc tối đa một lần mỗi 20 giây để không dồn dập. */
  function econFail(e, quiet) {
    if (e && (e.code === "session-replaced" || e.code === "device-limit") && state.account) { econKick(e.message); return; }
    const msg = e && e.message ? e.message : "Có lỗi xảy ra, vui lòng thử lại";
    if (quiet && Date.now() - econ.warnedAt < 20000) return;
    econ.warnedAt = Date.now();
    toast(msg);
  }

  /** Tài khoản đăng nhập nơi khác (hoặc đã dùng đủ 2 thiết bị trong tháng): đăng xuất phiên này. */
  function econKick(msg) {
    if (econ.kicked) return;
    econ.kicked = true;
    try { window.WindtpAuth.logout().catch(() => { }); } catch (e) { }
    localSignOut();
    toast(msg);
    window.setTimeout(() => { econ.kicked = false; }, 3000);
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
    return window.WindtpApi.wallet.refresh().then((me) => { econApplyWallet(me); econSyncBirth(me); econSocial(); econAutoRedeem(); econSyncPull(); return true; }, (e) => { econFail(e, quiet !== false); return false; });
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
    return Promise.all([api.tasks(), api.myOrders(), api.posts(), isAdmin() ? api.admin.posts() : Promise.resolve([]), api.store(), api.listings(), isAdmin() ? api.admin.listings() : Promise.resolve([])]).then(([tasks, orders, posts, pending, store, listings, pendingListings]) => {
      econApplyStore(store);
      // Bài đăng do máy chủ giữ; lượt thích và bình luận vẫn chỉ lưu trên máy này.
      state.posts = posts.map((p) => ({ id: "s" + p.id, author: p.author, tag: p.tag, text: p.text, ts: p.at, admin: p.admin || undefined, mine: p.mine, status: "approved", likes: p.likes, liked: p.liked, comments: p.comments.map((c) => ({ id: "s" + c.id, author: c.author, text: c.text, ts: c.at, mine: c.mine })) }))
        .concat(pending.map((p) => ({ id: "s" + p.id, author: p.author, tag: p.tag, text: p.text, ts: p.created_at, status: "pending", likes: 0, liked: false, comments: [] })));
      const me = userId();
      state.customTasks = tasks.map((t) => ({ id: t.id, title: t.title, desc: "", xu: t.xu, chips: t.chips, money: t.money, cur: t.cur, ts: 0 }));
      const lv = (l, status) => ({ id: "s" + l.id, cat: l.cat, title: l.title, price: l.price, loc: l.loc, country: l.country, region: l.region, addr: l.addr, desc: l.desc, seller: l.seller, emoji: l.emoji, ts: l.at, status, mine: l.mine, sid: "" });
      state.listings = listings.map((l) => lv(l, "approved")).concat(pendingListings.map((l) => lv(l, "pending")));
      const st = (o) => (o.status === "approved" ? "granted" : o.status === "pending" ? "sent" : "rejected");
      state.taskClaims = orders.filter((o) => o.kind === "ctask" && o.status !== "rejected").map((o) => ({ id: "o" + o.id, taskId: String(o.code || "").slice(6), uid: me, title: o.summary || "", ts: o.at, status: st(o), bank: null }));
      state.fbShares = orders.filter((o) => o.kind === "fbshare").map((o) => { const key = String(o.code || "").slice(3).toUpperCase(); return { id: "o" + o.id, uid: me, link: o.summary || "", period: key, periodLabel: key, ts: o.at, status: st(o) }; });
      commit(); renderTasks();
    }, () => { });
  }
  /** claim=true khi vừa đăng nhập: giành phiên (thiết bị khác bị đăng xuất) rồi mới lấy ví. Mở lại app đã đăng nhập thì không giành lại. */
  function econBoot(claim) {
    econ.me = null; econ.ref = null; econ.devs = null; econ.ordersLoaded = false; econ.syncReady = false;
    const go = () => econRefresh(false).then(() => { if (isAdmin()) econPublishCatalog(); });
    if (!claim || !window.WindtpApi) { go(); return; }
    econClient().claimSession().then(go, (e) => { if (e && e.code === "device-limit") econFail(e); else go(); });
  }
  function econReset() {
    econ.me = null; econ.adminOrders = []; econ.myOrders = []; econ.ordersLoaded = false; econ.birthSent = ""; econ.syncReady = false; window.clearTimeout(econ.syncTimer);
    if (window.WindtpApi) { window.WindtpApi.wallet.clear(); window.WindtpApi.clearSession(); }
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

  // ----- Mã mời bạn bè và thiết bị đăng nhập: máy chủ giữ mã, thưởng và giới hạn 2 thiết bị -----
  function econLoadInvite(force) {
    if (!state.account || !window.WindtpApi || userId() === "WIND-guest") return Promise.resolve(false);
    if (econ.inviteLoading || (!force && Date.now() - (econ.inviteTried || 0) < 30000)) return Promise.resolve(false);
    econ.inviteLoading = true; econ.inviteTried = Date.now();
    return Promise.all([econClient().referral(), econClient().devices()]).then(([r, d]) => {
      econ.ref = r; econ.devs = d; return true;
    }, (e) => { econFail(e, true); return false; }).then((ok) => {
      econ.inviteLoading = false;
      if (ok && $("#tab-wallet") && typeof renderWallet === "function") renderWallet();
      return ok;
    });
  }

  function inviteCard() {
    if (!state.account || userId() === "WIND-guest") return "";
    if (!econ.ref && !econ.inviteLoading) econLoadInvite();
    const r = econ.ref;
    if (!r) return `<div class="glass-card p-4 rounded-2xl"><p class="text-xs text-slate-500">Đang tải mã mời…</p></div>`;
    const devs = econ.devs;
    const rw = "🪙 " + fmt(r.reward.xu) + " Xu + 🎰 " + fmt(r.reward.chips) + " chip";
    return `<div class="glass-card p-4 rounded-2xl space-y-3">
    <h3 class="font-bold text-sm text-slate-800 flex items-center gap-2"><span>🎁</span> Mời bạn bè</h3>
    <p class="text-xs text-slate-600">Mỗi người có một mã mời. Bạn nhận <b>${rw}</b> khi người được mời <b>mua khóa học</b> (admin duyệt đơn).</p>
    <div class="flex items-center gap-2">
      <div class="flex-1 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-center font-black tracking-widest text-amber-800 select-all">${esc(r.code)}</div>
      <button data-action="ref-copy" class="px-3 py-2 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-white keep-white">Sao chép</button>
    </div>
    <p class="text-[11px] text-slate-500">Đã mời: <b>${fmt(r.invited)}</b> người · Đã nhận thưởng: <b>${fmt(r.rewarded)}</b> lượt</p>
    ${r.referredBy ? `<p class="text-[11px] text-emerald-600 font-bold">✓ Bạn đã nhập mã mời của người khác.</p>` : `<div class="flex gap-2">
      <input id="ref-code" maxlength="8" autocomplete="off" placeholder="Nhập mã mời của bạn bè" class="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase" />
      <button data-action="ref-redeem" class="px-3 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white keep-white">Nhập mã</button>
    </div>`}
    ${devs ? `<div class="pt-3 border-t border-slate-100"><p class="text-xs font-bold text-slate-800 mb-1">📱 Thiết bị tháng ${esc(devs.month.slice(5) + "/" + devs.month.slice(0, 4))}: ${devs.devices.length}/${devs.max}</p>
      <p class="text-[11px] text-slate-500 mb-2">Mỗi tháng đăng nhập tối đa ${devs.max} thiết bị, sang tháng mới được làm mới. Cùng lúc chỉ dùng được trên 1 thiết bị: đăng nhập ở nơi khác thì máy này bị đăng xuất.</p>
      <div class="space-y-1.5">${devs.devices.map((d, i) => `<div class="flex items-center justify-between gap-2 text-xs">
        <span class="font-bold text-slate-700">Thiết bị ${i + 1}${d.current ? " (máy này)" : ""}</span>
        <span class="text-[10px] ${d.active ? "text-emerald-600 font-bold" : "text-slate-400"}">${d.active ? "Đang đăng nhập" : "Đã dùng " + fmtDateTime(d.firstSeen)}</span>
      </div>`).join("")}</div></div>` : ""}
  </div>`;
  }

  function refLink() {
    let base = "";
    try { base = window.WINDTP && window.WINDTP.appUrl ? window.WINDTP.appUrl() : ""; } catch (e) { }
    if (!base) base = location.href;
    return base.split(/[?#]/)[0] + "?ref=" + encodeURIComponent(econ.ref ? econ.ref.code : "");
  }
  async function refCopy() {
    if (!econ.ref) { await econLoadInvite(true); if (!econ.ref) return; }
    const link = refLink(), text = "Học cùng mình trên WINDTP nhé! Mã mời: " + econ.ref.code + " " + link;
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch (e) { }
    if (copied) toast("Đã sao chép mã mời và liên kết.");
    else if (navigator.share) { try { await navigator.share({ title: "WINDTP", text: "Học cùng mình trên WINDTP nhé! Mã mời: " + econ.ref.code, url: link }); } catch (e) { } }
    else window.prompt("Sao chép mã mời:", text);
  }
  actions["ref-copy"] = refCopy;
  actions["referral-link"] = refCopy;

  async function redeemCode(code, quiet) {
    try {
      await econClient().redeemReferral(code);
      try { localStorage.removeItem("windtp-refcode"); } catch (e) { }
      if (!quiet) toast("Đã nhập mã mời. Người mời sẽ nhận thưởng khi bạn mua khóa học.");
      return true;
    } catch (e) {
      if (e && (e.code === "bad-code" || e.code === "self-referral" || e.code === "already-purchased" || e.code === "conflict")) { try { localStorage.removeItem("windtp-refcode"); } catch (_) { } }
      if (!quiet) throw e;
      return false;
    }
  }
  actions["ref-redeem"] = async () => {
    const code = (val("ref-code") || "").toUpperCase();
    if (!/^[A-Z2-9]{8}$/.test(code)) { toast("Mã mời gồm 8 ký tự"); return; }
    const ok = await econRun("ref-redeem", () => redeemCode(code, false));
    if (ok) await econLoadInvite(true);
  };
  // Mã mời lấy từ liên kết ?ref= được nhập tự động ở lần đăng nhập đầu tiên.
  function econAutoRedeem() {
    let code = "";
    try { code = localStorage.getItem("windtp-refcode") || ""; } catch (e) { }
    if (!/^[A-Z2-9]{8}$/.test(code) || econ.autoRedeemed) return;
    econ.autoRedeemed = true;
    redeemCode(code, true).then((ok) => { if (ok) econLoadInvite(true); });
  }
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
      if (el.dataset.type === "listing") {
        if (!isAdmin()) { toast("Chỉ BigBoss mới được kiểm duyệt nội dung."); return; }
        const ok = await econRun("mod:" + el.dataset.id, async () => { const api = econClient().admin, id = serverPostId(el); await (approve ? api.approveListing(id) : api.rejectListing(id)); return true; });
        if (!ok) return;
        toast(approve ? "Đã duyệt nội dung và cho phép hiển thị." : "Đã từ chối nội dung.");
        await econSocial(); refreshModal(); return;
      }
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

  // ----- Cấu hình cửa hàng do admin đăng (sản phẩm, chỉnh sửa, ẩn, danh mục) và ảnh sản phẩm trên R2 -----
  var lastStoreJson = "";
  function econImgUrl(key) { return typeof key === "string" && /^img\//.test(key) ? window.WindtpApi.baseUrl + "/" + key : key; }
  function econImgKey(url) { const root = window.WindtpApi.baseUrl + "/"; return typeof url === "string" && url.indexOf(root + "img/") === 0 ? url.slice(root.length) : null; }
  function econStoreView(cfg) {
    const fix = (o) => (o && o.img ? Object.assign({}, o, { img: econImgUrl(o.img) }) : o);
    const edits = {}; Object.keys(cfg.productEdits).forEach((k) => { edits[k] = fix(cfg.productEdits[k]); });
    return { customProducts: cfg.customProducts.map(fix), productEdits: edits, hiddenProducts: cfg.hiddenProducts.slice(), customCats: cfg.customCats.slice() };
  }
  function econApplyStore(cfg) {
    // Admin lần đầu dùng máy chủ: chuyển dữ liệu cửa hàng cũ trên máy này lên một lần.
    if (isAdmin() && !cfg.updatedAt && window.__legacyStore) {
      const legacy = window.__legacyStore; window.__legacyStore = null;
      Object.assign(state, { customProducts: legacy.customProducts, productEdits: legacy.productEdits, hiddenProducts: legacy.hiddenProducts, customCats: legacy.customCats });
      syncCustomProducts(); econPutStore(); return;
    }
    window.__legacyStore = null;
    const view = econStoreView(cfg), json = JSON.stringify(view);
    if (json === lastStoreJson) return;
    lastStoreJson = json;
    Object.assign(state, view);
    syncCustomProducts();
    if (["shop", "community", "utilities"].includes(ui.tab)) renderTab(ui.tab);
  }
  function econDataBlob(dataUrl) {
    const m = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl); if (!m) return null;
    const bin = atob(m[2]), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: m[1] });
  }
  /** Ảnh mới chọn (data URL) được tải lên R2 rồi thay bằng địa chỉ máy chủ; ảnh đã ở máy chủ giữ nguyên. */
  async function econUploadImg(o) {
    if (!o || !o.img || econImgKey(o.img)) return;
    const blob = econDataBlob(o.img);
    if (!blob) { delete o.img; return; }
    o.img = econImgUrl(await econClient().admin.uploadImage(blob));
  }
  function econPutStore() {
    if (!isAdmin()) return Promise.resolve(false);
    return econRun("store", async () => {
      for (const p of state.customProducts) await econUploadImg(p);
      for (const k of Object.keys(state.productEdits || {})) await econUploadImg(state.productEdits[k]);
      const strip = (o) => { if (!o || !o.img) return o; const key = econImgKey(o.img); const c = Object.assign({}, o); if (key) c.img = key; else delete c.img; return c; };
      const edits = {}; Object.keys(state.productEdits || {}).forEach((k) => { edits[k] = strip(state.productEdits[k]); });
      await econClient().admin.putStore({ customProducts: state.customProducts.map(strip), productEdits: edits, hiddenProducts: state.hiddenProducts || [], customCats: state.customCats || [] });
      lastStoreJson = "";
      commit();
      return true;
    });
  }
  ["pp-submit", "pp-edit-save", "pp-edit-reset", "pp-del"].forEach((name) => {
    const orig = actions[name];
    if (typeof orig !== "function") return;
    actions[name] = (el, ev) => {
      if (!isAdmin()) return;
      const before = JSON.stringify([state.customProducts, state.productEdits, state.hiddenProducts]);
      orig(el, ev);
      if (JSON.stringify([state.customProducts, state.productEdits, state.hiddenProducts]) !== before) econPutStore();
    };
  });
  ["open-category", "submit-category", "delete-category"].forEach((name) => {
    const orig = actions[name];
    actions[name] = (el, ev) => {
      if (!isAdmin()) { toast("Chỉ BigBoss mới tạo và xóa được danh mục."); return; }
      const before = JSON.stringify(state.customCats);
      orig(el, ev);
      if (JSON.stringify(state.customCats) !== before) econPutStore();
    };
  });

  // ----- Tin rao vặt: lưu và kiểm duyệt ở máy chủ -----
  const origSubmitListing = actions["submit-listing"];
  actions["submit-listing"] = async (el, ev) => {
    const before = state.listings.length, firstId = state.listings[0] && state.listings[0].id;
    origSubmitListing(el, ev);
    const l = state.listings[0];
    if (!l || state.listings.length === before || l.id === firstId) return; // dữ liệu chưa hợp lệ, form giữ nguyên
    state.listings.shift();
    const ok = await econRun("listing", async () => {
      await econClient().createListing({ cat: l.cat, title: l.title, price: l.price, loc: l.loc, country: l.country, region: l.region, addr: l.addr, desc: l.desc, emoji: l.emoji });
      return true;
    });
    if (ok) econSocial();
  };
  actions["delete-listing"] = async (el) => {
    const id = Number(String(el.dataset.id || "").replace(/^s/, ""));
    const ok = await econRun("dellisting", async () => { await econClient().deleteListing(id); return true; });
    if (!ok) return;
    state.saved = state.saved.filter((x) => x !== el.dataset.id);
    toast("Đã xóa tin"); await econSocial(); refreshModal();
  };

  // ----- Thích và bình luận: lưu ở máy chủ, mỗi người một lượt thích -----
  actions["like-post"] = async (el) => {
    const p = state.posts.find((x) => x.id === el.dataset.id);
    if (!p) return;
    const res = await econRun("like:" + p.id, async () => econClient().likePost(serverPostId(el), !p.liked));
    if (!res) return;
    p.liked = res.liked; p.likes = res.likes;
    commit(); renderCommunity();
  };
  actions["send-comment"] = async (el) => {
    const id = el.dataset.id || "", text = val("cmt-" + id).trim();
    if (!text) { toast("Hãy nhập nội dung bình luận"); return; }
    const ok = await econRun("cmt:" + id, async () => { await econClient().commentPost(serverPostId(el), text); return true; });
    if (!ok) return;
    await econSocial(); renderCommunity();
  };
  actions["delete-comment"] = async (el) => {
    const ok = await econRun("delcmt:" + el.dataset.id, async () => { await econClient().deleteComment(serverPostId(el)); return true; });
    if (!ok) return;
    await econSocial(); renderCommunity();
  };

  // ----- Đồng bộ dữ liệu cá nhân giữa các thiết bị (bản ghi sau cùng thắng; tiền, quyền sở hữu, bài đăng không nằm trong đó) -----
  const SYNC_TYPES = { lang: "stringnull", known: "object", saved: "array", reminders: "array", notices: "array", settings: "object", streak: "number", lastCheckIn: "string", loginStreak: "number", lastLogin: "string", cultivationLevel: "number", cultivationLastPenalty: "string", streakRewardsClaimed: "array", avatarId: "string", frameId: "string", ownedAvatars: "array", ownedFrames: "array", social: "object", cart: "object", alpha: "object" };
  const syncOk = (t, v) => t === "array" ? Array.isArray(v) : t === "object" ? !!v && typeof v === "object" && !Array.isArray(v) : t === "stringnull" ? v === null || typeof v === "string" : typeof v === t;
  function syncSnapshot() {
    const o = {};
    Object.keys(SYNC_TYPES).forEach((k) => { if (state[k] !== undefined) o[k] = state[k]; });
    if (o.settings) { o.settings = { ...o.settings }; delete o.settings.birth; } // ngày sinh do máy chủ giữ riêng
    return o;
  }
  function syncHash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; return str.length + ":" + h; }
  function econSyncApply(remote) {
    const birth = state.settings && state.settings.birth;
    Object.keys(SYNC_TYPES).forEach((k) => {
      if (!Object.prototype.hasOwnProperty.call(remote, k) || !syncOk(SYNC_TYPES[k], remote[k])) return;
      state[k] = k === "settings" ? { ...state.settings, ...remote.settings, birth } : remote[k];
    });
    if (econ.me) econApplyWallet(econ.me); // avatar/khung mua bằng Xu luôn do máy chủ xác nhận, không lấy từ bản đồng bộ
  }
  async function econSyncPush() {
    if (!state.account || !econ.syncReady || econ.syncBusy) return;
    const snap = syncSnapshot(), hash = syncHash(JSON.stringify(snap)), email = state.account.email;
    if (state.syncMeta && state.syncMeta.hash === hash) return;
    econ.syncBusy = true;
    try {
      const rev = await econClient().saveProfile(snap);
      if (state.account && state.account.email === email) { state.syncMeta = { rev, hash }; save(); }
      econ.syncBusy = false; econSyncSchedule(); return;
    } catch (e) { econ.syncTimer = window.setTimeout(econSyncPush, 30000); }
    finally { econ.syncBusy = false; }
  }
  async function econSyncPull() {
    if (!state.account || !window.WindtpApi || econ.syncPulling) return;
    econ.syncPulling = true;
    const email = state.account.email;
    try {
      const remote = await econClient().profile();
      if (!state.account || state.account.email !== email) return;
      const meta = state.syncMeta || {}, dirty = syncHash(JSON.stringify(syncSnapshot())) !== meta.hash;
      if (remote.state && remote.rev !== meta.rev && (!dirty || meta.hash === undefined)) {
        econSyncApply(remote.state);
        state.syncMeta = { rev: remote.rev, hash: syncHash(JSON.stringify(syncSnapshot())) };
        commit();
      }
      econ.syncReady = true;
      econSyncSchedule();
    } catch (e) { /* mất mạng: giữ dữ liệu trên máy, chưa đẩy gì lên để khỏi ghi đè bản trên máy chủ */ }
    finally { econ.syncPulling = false; }
  }
  function econSyncSchedule() {
    window.clearTimeout(econ.syncTimer);
    econ.syncTimer = window.setTimeout(econSyncPush, 4000);
  }
  subscribe(() => { if (state.account && econ.syncReady) econSyncSchedule(); });
