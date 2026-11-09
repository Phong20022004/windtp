  /* ===== v17: hiệu ứng máy chủ, nhiệm vụ chia sẻ Facebook, học thử ===== */
  function admBurst(x, y) {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const W = window.innerWidth, H = window.innerHeight, cx = x == null ? W / 2 : x, cy = y == null ? H * 0.35 : y, em = ["✨", "👑", "💫", "⭐", "🌟", "💎"];
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 130, e = document.createElement("span");
        e.className = "adm-fx"; e.textContent = em[i % em.length];
        e.style.setProperty("--x", cx + "px"); e.style.setProperty("--y", cy + "px");
        e.style.setProperty("--dx", Math.cos(a) * r + "px"); e.style.setProperty("--dy", Math.sin(a) * r - 40 + "px"); e.style.setProperty("--r", Math.round(Math.random() * 360 - 180) + "deg");
        document.body.appendChild(e); setTimeout(() => e.remove(), 1400);
      }
    } catch (e) { }
  }
  var FB_REWARD = 1000;
  function fbPeriod(d) {
    d = d || new Date(); const y = d.getFullYear(), m = d.getMonth(), day = d.getDate(), h = day <= 15 ? "A" : "B", mm = String(m + 1).padStart(2, "0");
    const next = day <= 15 ? new Date(y, m, 16) : new Date(y, m + 1, 1);
    return { key: y + "-" + mm + "-" + h, label: day <= 15 ? "01–15/" + mm : "16–" + new Date(y, m + 1, 0).getDate() + "/" + mm, next: String(next.getDate()).padStart(2, "0") + "/" + String(next.getMonth() + 1).padStart(2, "0") + "/" + next.getFullYear() };
  }
  function fbMine() { const k = fbPeriod().key, me = userId(); return (state.fbShares || []).find((x) => x.uid === me && x.period === k) || null; }
  var FB_LINK_RE = /^https:\/\/(?:www\.|m\.|web\.|mbasic\.)?(?:facebook\.com|fb\.com|fb\.watch|fb\.me)\/[^\s]{3,}$/i;
  function fbShareHtml() {
    const per = fbPeriod(), mine = fbMine(), adm = isAdmin(), guest = userId() === "WIND-guest";
    let body;
    if (mine && mine.status === "granted") body = `<div class="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs"><p class="font-extrabold text-emerald-700">✅ Đã nhận ${fmt(FB_REWARD)} Xu cho kỳ ${per.label}</p><p class="text-slate-600 mt-1">Lượt tiếp theo mở ngày <b>${per.next}</b>.</p></div>`;
    else if (mine && mine.status === "sent") body = `<div class="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs"><p class="font-extrabold text-amber-700">⏳ Đã gửi link, chờ máy chủ xác minh</p><p class="text-slate-600 mt-1 break-all">${esc(mine.link)}</p></div>`;
    else body = `${mine && mine.status === "rejected" ? `<p class="text-xs font-bold text-rose-600">❌ Link lần trước bị từ chối. Bạn có thể gửi lại link hợp lệ trong kỳ này.</p>` : ""}
      <div class="flex flex-wrap gap-2"><button data-action="fb-open-share" class="px-3 py-2 rounded-xl text-xs font-extrabold text-white keep-white" style="background:#1877f2">📘 Chia sẻ lên Facebook</button><button data-action="fb-copy-caption" class="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-blue-200 text-blue-800">📋 Sao chép nội dung gợi ý</button></div>
      <input id="fb-link" inputmode="url" maxlength="300" placeholder="Dán link bài viết Facebook đã đăng công khai" class="${field}">
      <label class="flex items-start gap-2 text-[11px] text-slate-700"><input id="fb-ok" type="checkbox" class="mt-0.5"><span>Tôi cam kết bài viết ở chế độ <b>Công khai</b> và tôi <b>không dùng nick clone</b>.</span></label>
      <button data-action="fb-submit" class="w-full ${btnPrimary}">Gửi link chờ xác minh</button>`;
    const queue = (state.fbShares || []).filter((x) => x.status === "sent");
    const adminBox = adm ? `<div class="rounded-2xl border border-sky-200 bg-sky-50 p-3 space-y-2 text-xs"><p class="font-extrabold text-sky-900">Xác minh chia sẻ Facebook (${queue.length} chờ)</p>${queue.length ? queue.map((x) => `<div class="bg-white rounded-lg border border-slate-200 p-2 space-y-1"><p class="text-[11px]"><b>${esc(x.uid)}</b> · kỳ ${esc(x.periodLabel || x.period)}</p><a href="${esc(x.link)}" target="_blank" rel="noopener noreferrer nofollow" class="block text-[11px] text-blue-700 underline break-all">${esc(x.link)}</a><div class="flex gap-2"><button data-action="fb-approve" data-id="${x.id}" class="flex-1 py-1 rounded-lg bg-emerald-600 text-white keep-white text-[11px] font-bold">✅ Xác minh +${fmt(FB_REWARD)} Xu</button><button data-action="fb-reject" data-id="${x.id}" class="flex-1 py-1 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-bold">❌ Từ chối</button></div></div>`).join("") : '<p class="text-slate-500">Chưa có link nào cần xác minh.</p>'}</div>` : "";
    return `<div class="glass-card rounded-2xl p-4 sm:p-5 border border-blue-200 bg-blue-50/60 space-y-3">
      <div class="flex items-start gap-3"><div class="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl shrink-0">📘</div>
      <div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-2"><h3 class="font-extrabold text-sm text-slate-800">Chia sẻ WINDTP lên Facebook</h3><span class="text-xs font-black text-amber-600 whitespace-nowrap">+${fmt(FB_REWARD)} Xu</span></div>
      <p class="text-xs text-slate-600 mt-1">Đăng bài giới thiệu app ở chế độ <b>Công khai</b>, sao chép link bài viết rồi gửi về chờ máy chủ xác minh.</p>
      <p class="text-[11px] font-bold text-blue-800 mt-1">Mỗi tháng có 2 kỳ (01–15 và 16–cuối tháng), mỗi kỳ làm được 1 lần. Kỳ hiện tại: ${per.label}.</p></div></div>
      <div class="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-[11px] font-bold text-rose-700">⚠️ Cảnh báo: CẤM sử dụng nick clone (tài khoản ảo, giả mạo, mới lập). Phát hiện sẽ bị từ chối thưởng và có thể bị khóa tài khoản.</div>
      ${guest ? '<p class="text-xs text-slate-500">Hãy đăng nhập để làm nhiệm vụ này.</p>' : body}${adminBox}</div>`;
  }
  Object.assign(actions, {
    "fb-open-share": () => {
      const u = /^https?:/.test(location.protocol) ? location.href.split("#")[0] : "";
      try { window.open(u ? "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(u) : "https://www.facebook.com/", "_blank", "noopener"); } catch (e) { }
      toast("Nhớ chọn quyền xem bài viết là Công khai (Public).");
    },
    "fb-copy-caption": () => {
      const t = "Mình đang học ngoại ngữ cùng WINDTP Super-App 🚀 Học từ vựng, thi thử, nhận thưởng mỗi ngày! #WINDTP #HocNgoaiNgu";
      try { navigator.clipboard.writeText(t).then(() => toast("Đã sao chép nội dung gợi ý"), () => window.prompt("Sao chép nội dung:", t)); } catch (e) { window.prompt("Sao chép nội dung:", t); }
    },
    "fb-submit": () => {
      if (userId() === "WIND-guest") { toast("Hãy đăng nhập để làm nhiệm vụ"); return; }
      const cur = fbMine(); if (cur && cur.status !== "rejected") { toast("Bạn đã gửi link cho kỳ này rồi"); return; }
      const link = (val("fb-link") || "").trim();
      if (!FB_LINK_RE.test(link)) { toast("Link không hợp lệ. Hãy dán link bài viết từ facebook.com"); return; }
      if (!$("#fb-ok")?.checked) { toast("Hãy tích cam kết công khai và không dùng nick clone"); return; }
      const norm = (u) => u.toLowerCase().replace(/\/+$/, "");
      if ((state.fbShares || []).some((x) => norm(x.link) === norm(link))) { toast("Link này đã được gửi trước đó"); return; }
      const per = fbPeriod();
      state.fbShares = (state.fbShares || []).filter((x) => !(x.uid === userId() && x.period === per.key));
      state.fbShares.unshift({ id: uid("fb"), uid: userId(), link, period: per.key, periodLabel: per.label, ts: Date.now(), status: "sent" });
      commit(); renderTasks(); toast("Đã gửi link, chờ máy chủ xác minh");
    },
    "fb-approve": (el) => {
      if (!isAdmin()) return;
      const x = (state.fbShares || []).find((y) => y.id === el.dataset.id); if (!x || x.status !== "sent") return;
      x.status = "granted"; x.doneTs = Date.now();
      creditTo(x.uid, FB_REWARD, 0, "Thưởng chia sẻ Facebook");
      commit(); renderTasks(); toast("Đã xác minh và cộng " + fmt(FB_REWARD) + " Xu cho " + x.uid);
    },
    "fb-reject": (el) => {
      if (!isAdmin()) return;
      const x = (state.fbShares || []).find((y) => y.id === el.dataset.id); if (!x || x.status !== "sent") return;
      x.status = "rejected"; x.doneTs = Date.now(); commit(); renderTasks(); toast("Đã từ chối link");
    }
  });
  var adminFails = 0, adminLockUntil = 0;
  Object.assign(actions, {
    "logout": () => { save(); const keep = {}; SHARED.forEach((k) => { if (state[k] !== undefined) keep[k] = state[k]; }); Object.keys(state).forEach((k) => { if (!SHARED.includes(k)) delete state[k]; }); Object.assign(state, seed(), keep, { account: null }); commit(); closeModal(); showLogin(); },
    "open-add-product": () => { if (!isAdmin()) { toast("Chỉ BigBoss mới đăng được sản phẩm."); return; } ui.ppImg = null; openModal(addProductModal); },
    "pp-submit": () => {
      if (!isAdmin()) { toast("Chỉ BigBoss mới đăng được sản phẩm."); return; }
      const name = val("pp-name"), vnd = Math.round(Number(val("pp-price").replace(/[^\d]/g, ""))), catSub = val("pp-cat"), cat = catSub.split("|")[0], sub = catSub.split("|")[1] || "", desc = val("pp-desc");
      if (!ui.ppImg) { toast("Hãy chọn ảnh sản phẩm từ máy"); return; }
      if (name.length < 3) { toast("Tên sản phẩm cần tối thiểu 3 ký tự"); return; }
      if (!(vnd > 0) || !STALLS[cat]) { toast("Hãy nhập giá hợp lệ và chọn gian hàng"); return; }
      const p = { id: uid("px"), custom: true, name, desc: desc || "Sản phẩm mới của WINDTP", price: { VND: vnd, KRW: Math.max(100, Math.round(vnd / 19 / 100) * 100), JPY: Math.max(10, Math.round(vnd / 160 / 10) * 10) }, cat, sub, emoji: STALLS[cat].emoji, img: ui.ppImg, ts: Date.now(), rewardXu: Math.max(0, Math.floor(Number(val("pp-xu")) || 0)), rewardChips: Math.max(0, Math.floor(Number(val("pp-chip")) || 0)) };
      state.customProducts.unshift(p);
      syncCustomProducts();
      ui.shopCat = cat; ui.shopSub = sub; ui.shopQuery = "";
      ui.ppImg = null;
      commit();
      if (!save()) toast("Bộ nhớ trình duyệt đầy, sản phẩm có thể không được lưu");
      closeModal();
      toast("✅ Đã đăng sản phẩm lên cửa hàng");
    },
    "open-courses": () => openCourses(),
    "copy-acc": (el) => { const t = el.dataset.text || ""; try { navigator.clipboard.writeText(t).then(() => toast("Đã sao chép"), () => window.prompt("Sao chép số tài khoản:", t)); } catch (e) { window.prompt("Sao chép số tài khoản:", t); } },
    "course-lang": (el) => { const c = el.dataset.code; if (LANGUAGES.some((l) => l.code === c)) { ui.courseLang = c; renderTab("shop"); } },
    "open-course-lang": (el) => { const c = el.dataset.code; if (!LANGUAGES.some((l) => l.code === c)) return; state.lang = c; commit(); goTo("learn"); },
    "pp-del": (el) => {
      if (!isAdmin()) return;
      if (!window.confirm("Xóa sản phẩm này khỏi cửa hàng?")) return;
      const id = el.dataset.id;
      const wasCustom = (state.customProducts || []).some((p) => p.id === id);
      state.customProducts = (state.customProducts || []).filter((p) => p.id !== id);
      if (!wasCustom) { state.hiddenProducts = state.hiddenProducts || []; if (!state.hiddenProducts.includes(id)) state.hiddenProducts.push(id); }
      delete state.cart[id];
      syncCustomProducts();
      commit();
      if (el.dataset.from === "modal") closeModal();
      renderTab("shop");
      toast("Đã xóa sản phẩm");
    },
    "pp-restore": () => {
      if (!isAdmin()) return;
      state.hiddenProducts = [];
      syncCustomProducts();
      commit(); refreshModal(); renderTab("shop");
      toast("Đã khôi phục các sản phẩm đã xóa");
    },
    "buy-doc-money": (el) => {
      const code = el.dataset.code ?? "en", id = "docm-" + code;
      if (state.owned.includes("doc-" + code)) return;
      if (!PRODUCTS.some((p) => p.id === id)) { toast("Tài liệu này hiện không còn bán"); return; }
      state.cart[id] = 1;
      commit();
      toast("Đã thêm tài liệu vào giỏ hàng");
      openModal(cartModal, true);
    },
    "game-buy-xu": () => {
      ui.topup = null; ui.topupCode = null;
      topupState().src = "game";
      openModal(topupModal);
    },
    "lock-buy": (el) => {
      const c = el.dataset.code;
      if (LANGUAGES.some((l) => l.code === c)) ui.courseLang = c;
      closeModal();
      openCourses();
    }
  });
