  // ===== Danh tính riêng của MÁY CHỦ (chỉ BigBoss/admin mới thấy & chọn được) =====
  var ADMIN_AVATAR_ID = "admin-logo", ADMIN_FRAME_ID = "f-admin-sovereign";
  AVATARS.push({ id: ADMIN_AVATAR_ID, name: "Logo trang ch\u1EE7 \u00B7 M\u00E1y ch\u1EE7", logo: true, bg: "linear-gradient(135deg,#0a1630,#1e4fa8 55%,#27a3d9)", price: 0, unlock: "admin" });
  FRAMES.push({ id: ADMIN_FRAME_ID, name: "Ho\u00E0ng Kim Thi\u00EAn \u0110\u1EBF \u00B7 M\u00E1y ch\u1EE7", cls: "rframe rfadm", fx: "adm-sovereign", price: 0, unlock: "admin" });
  function adminLogoHtml(px) {
    return `<span class="wd-logo adm-home" role="img" aria-label="WINDTP"><span>\u98CE</span></span>`;
  }
  function guardAdminCosmetics() {
    if (!state.account || isAdmin() || !window.WindtpAuth.isSettled()) return;
    if (avatarById(state.avatarId).unlock === "admin") state.avatarId = "default";
    if (frameById(state.frameId).unlock === "admin") state.frameId = "none";
  }
  var avatarById = (id) => AVATARS.find((a) => a.id === id) ?? AVATARS[0];
  var frameById = (id) => FRAMES.find((f) => f.id === id) ?? FRAMES[0];
  function isOwned(kind, id) {
    const item = kind === "avatar" ? avatarById(id) : frameById(id);
    if (item.unlock === "free") return true;
    if (item.unlock === "premium") return isPremium();
    if (item.unlock === "admin") return isAdmin();
    if (item.unlock === "realm") return Number(state.cultivationLevel || 0) >= item.realm;
    return (kind === "avatar" ? state.ownedAvatars : state.ownedFrames).includes(id);
  }
  var REALM_FX = [
    { tw: [[35, "✦", "#bbf7d0", 0], [215, "✧", "#ecfccb", .9]] },
    { tw: [[30, "✦", "#99f6e4", 0], [150, "✧", "#ccfbf1", .6], [250, "✦", "#5eead4", 1.2]] },
    { tw: [[20, "✦", "#fde047", 0], [110, "✧", "#fff7ad", .5], [200, "✦", "#fbbf24", 1], [290, "✧", "#fef3c7", 1.5]], orb: [[0, "✦", "#fde047"]] },
    { up: [[-55, "🔥", 0], [-25, "🔥", .45], [10, "🔥", .9], [45, "🔥", .2], [75, "🔥", .7]], tw: [[200, "✦", "#fdba74", .4]] },
    { fl: [[20, "⚡", 0], [110, "⚡", .8], [200, "⚡", 1.6], [290, "⚡", .4]], tw: [[60, "✦", "#bae6fd", .3], [250, "✦", "#93c5fd", 1]] },
    { orb: [[0, "✦", "#e9d5ff"], [120, "✦", "#d8b4fe"], [240, "✧", "#f0abfc"]], tw: [[60, "✧", "#c4b5fd", .2], [180, "✦", "#e879f9", .9]], ring2: "#c084fc" },
    { orb: [[0, "✦", "#fde047"], [120, "✦", "#fde047"], [240, "✦", "#fde047"]], orb2: [[60, "✧", "#67e8f9"], [180, "✦", "#22d3ee"], [300, "✧", "#67e8f9"]], ring2: "#22d3ee" },
    { up: [[-40, "🔥", 0], [0, "🔥", .6], [40, "🔥", 1.2]], fl: [[110, "⚡", .3], [250, "⚡", 1.3]], orb: [[0, "✦", "#fff"], [120, "✦", "#fde047"], [240, "✧", "#f0abfc"]], ring2: "#fde047" },
    { up: [[-60, "🔥", 0], [-30, "🔥", .4], [0, "🔥", .8], [30, "🔥", .2], [60, "🔥", .6]], fl: [[95, "⚡", 0], [140, "⚡", 1.1], [225, "⚡", .6], [270, "⚡", 1.7]], orb: [[0, "✦", "#fff"], [90, "✦", "#fde047"], [180, "✧", "#f0abfc"], [270, "✦", "#67e8f9"]], orb2: [[45, "✧", "#fff"], [135, "✦", "#f472b6"], [225, "✧", "#fde047"], [315, "✦", "#a5b4fc"]], ring2: "#fff", halo: true }
  ];
  var STREAK_FX = {
    s7: { up: [[-40, "✨", 0], [0, "✨", .6], [40, "✨", 1.2]], tw: [[110, "✦", "#fde047", .3], [250, "✧", "#fff7ad", 1]] },
    s15: { orb: [[0, "🍃", "#fff"], [120, "🍃", "#fff"], [240, "🍃", "#fff"]], tw: [[60, "✧", "#bae6fd", .2], [200, "✦", "#a5f3fc", .9]], ring2: "#7dd3fc" },
    s30: { orb: [[0, "✦", "#fff"], [120, "✧", "#c4b5fd"], [240, "✦", "#f9a8d4"]], fl: [[40, "🌠", 0], [220, "🌠", 1.2]], tw: [[90, "✧", "#e0e7ff", .4], [160, "✦", "#a5b4fc", 1.1], [300, "✧", "#fbcfe8", .8]], ring2: "#818cf8" }
  };
  Object.assign(STREAK_FX, {
    "pm-angel": { halo: true, ring2: "#fde68a", up: [[-40, "🪶", 0], [40, "🪶", 1]], orb: [[0, "✦", "#fde68a"], [180, "✧", "#fff"]] },
    "pm-devil": { ring2: "#ef4444", up: [[-40, "🔥", 0], [0, "🔥", .5], [40, "🔥", 1]], fl: [[110, "⚡", .3], [250, "⚡", 1.3]], orb: [[0, "🦇", "#fff"], [180, "🦇", "#fff"]] },
    "pm-aurora": { ring2: "#34d399", orb: [[0, "✦", "#67e8f9"], [120, "✦", "#a7f3d0"], [240, "✧", "#f0abfc"]], tw: [[60, "✧", "#fff", .2], [180, "✦", "#c4b5fd", .9], [300, "✧", "#f9a8d4", .5]] },
    "p-sky": { orb: [[0, "☁️", "#fff"], [180, "☁️", "#fff"]], tw: [[60, "✧", "#e0f2fe", 0], [150, "✦", "#bae6fd", .8], [270, "✧", "#fff", 1.4]] },
    "p-sakura": { dn: [[-45, "🌸", 0], [0, "🌸", .7], [45, "🌸", 1.3]], tw: [[120, "✦", "#fbcfe8", .3], [240, "✧", "#fff", 1]] },
    "p-neon": { tw: [[30, "✦", "#e9d5ff", 0], [150, "✧", "#67e8f9", .5], [260, "✦", "#f0abfc", 1]], ring2: "#a855f7" },
    "p-fire": { up: [[-35, "🔥", 0], [5, "🔥", .5], [40, "🔥", 1]], tw: [[130, "✦", "#fdba74", .3], [240, "✦", "#fde047", .9]] },
    "p-ocean": { up: [[-50, "🫧", 0], [-10, "🫧", .7], [35, "🫧", 1.3]], orb: [[0, "✧", "#bae6fd"], [180, "✦", "#67e8f9"]] },
    "p-rainbow": { orb: [[0, "✦", "#fde047"], [120, "✦", "#f472b6"], [240, "✦", "#67e8f9"]], tw: [[60, "✧", "#fff", .2], [180, "✧", "#fff", .9]], ring2: "#fff" }
  });
  STREAK_FX["adm-sovereign"] = { halo: true, ring2: "#fde047", ring3: true, crown: true, orb: [[0, "\u25C6", "#fde047"], [90, "\u25C6", "#22d3ee"], [180, "\u25C6", "#f472b6"], [270, "\u25C6", "#a78bfa"]], orb2: [[45, "\u2726", "#fff"], [135, "\u2727", "#fde68a"], [225, "\u2726", "#fff"], [315, "\u2727", "#fde68a"]], up: [[-30, "\u2728", 0], [30, "\u2728", .9]], tw: [[70, "\u2727", "#fff", .3], [200, "\u2726", "#fde68a", 1]] };
  function realmFrameFx(level, px) {
    const spec = typeof level === "string" ? STREAK_FX[level] : REALM_FX[level];
    if (!spec || px < 30) return "";
    const r = px / 2;
    const fs = Math.max(8, Math.round(px * 0.23));
    const pos = (a) => `left:${(r + Math.sin(a * Math.PI / 180) * r).toFixed(1)}px;top:${(r - Math.cos(a * Math.PI / 180) * r).toFixed(1)}px;font-size:${fs}px`;
    let h = "";
    if (spec.halo) h += `<i class="rf-halo"></i>`;
    if (spec.ring3) h += `<i class="adm-ring3"></i>`;
    if (spec.crown && px >= 40) h += `<i class="adm-crown" style="font-size:${Math.round(px * 0.36)}px">\u{1F451}</i>`;
    if (spec.ring2) h += `<i class="rf-ring2" style="--c2:${spec.ring2}"></i>`;
    (spec.tw || []).forEach(([a, g, c, d]) => { h += `<b class="rf-p rf-tw" style="${pos(a)};color:${c};animation-delay:${d}s">${g}</b>`; });
    (spec.up || []).forEach(([a, g, d]) => { h += `<b class="rf-p rf-up" style="${pos(a)};animation-delay:${d}s">${g}</b>`; });
    (spec.dn || []).forEach(([a, g, d]) => { h += `<b class="rf-p rf-dn" style="${pos(a)};animation-delay:${d}s">${g}</b>`; });
    (spec.fl || []).forEach(([a, g, d]) => { h += `<b class="rf-p rf-fl" style="${pos(a)};animation-delay:${d}s">${g}</b>`; });
    if (spec.orb) h += `<i class="rf-orbit">${spec.orb.map(([a, g, c], i) => `<b class="rf-p rf-tw" style="${pos(a)};color:${c};animation-delay:${i * .4}s">${g}</b>`).join("")}</i>`;
    if (spec.orb2) h += `<i class="rf-orbit rev" style="animation-duration:8s">${spec.orb2.map(([a, g, c], i) => `<b class="rf-p rf-tw" style="${pos(a)};color:${c};animation-delay:${i * .5 + .2}s">${g}</b>`).join("")}</i>`;
    return h;
  }
  function renderPfp(name, avatarId, frameId, px, opts) {
    let a = avatarById(avatarId);
    if (a.unlock === "premium" && avatarId === state.avatarId && !isPremium()) a = AVATARS[0];
    if (a.unlock === "admin" && !(opts && opts.official) && !isAdmin()) a = AVATARS[0];
    let f = frameById(frameId);
    if (f.unlock === "premium" && frameId === state.frameId && !isPremium()) f = FRAMES[0];
    if (f.unlock === "admin" && !(opts && opts.official) && !isAdmin()) f = FRAMES[0];
    const b = f.id === "none" ? 0 : Math.max(2, Math.round(px * (f.realm != null || f.fx ? 0.09 : 0.075)));
    const content = opts && opts.emoji ? esc(opts.emoji) : a.logo ? adminLogoHtml(px) : a.img ? `<img src="${a.img}" alt="${esc(a.name)}" class="w-full h-full object-cover" style="image-rendering:auto;filter:none;opacity:1" onerror="this.onerror=null;this.style.display='none'">` : (a.emoji ? a.emoji : esc(initial(name)));
    const fs = Math.round(px * (a.emoji || (opts && opts.emoji) ? 0.5 : 0.42));
    const rank = cultivationRank();
    const rk = opts && opts.realm != null ? Math.max(0, Math.min(CULTIVATION_RANKS.length - 1, Number(opts.realm) || 0)) : null;
    const badge = rk != null ? `<span class="cultivation-badge" title="Cảnh giới: ${CULTIVATION_RANKS[rk].name}">${realmGlyph(rk, Math.max(11, Math.round(px * 0.34)), false)}</span>` : (name === state.userName ? `<span class="cultivation-badge" title="Cảnh giới: ${rank.name}" aria-label="Cảnh giới ${rank.name}">${realmGlyph(cultivationIndex(), Math.max(11, Math.round(px * 0.34)), false)}</span>` : "");
    const fx = f.realm != null ? realmFrameFx(f.realm, px) : (f.fx ? realmFrameFx(f.fx, px) : "");
    const st = opts && opts.status ? opts.status : "";
    const html = `<div class="pfp ${f.cls}${st ? (st === "on" ? " pfp-on" : " pfp-off") : ""}" style="width:${px}px;height:${px}px;--b:${b}px;--px:${px}px"><div class="pfp-in keep-white" style="background:${opts && opts.emoji ? "radial-gradient(circle at 35% 30%,#fff7df,#e2d1a3)" : a.bg};font-size:${fs}px">${content}</div>${fx}${badge}</div>`;
    if (!st) return html;
    return `<div class="pfp-wrap" style="width:${px}px;height:${px}px">${html}<span class="st-chip ${st === "on" ? "on" : "off"}">${st === "on" ? "● Online" : "○ Offline"}</span></div>`;
  }
  // Khung avatar thực tế của người dùng: nếu chưa chọn khung (hoặc khung không còn hợp lệ)
  // thì tự dùng khung theo cảnh giới hiện tại — giống hệt người chơi khác.
  function myFrameId() {
    let fid = state.frameId || "none";
    const fr = frameById(fid);
    if (fr.realm != null && !isOwned("frame", fid)) fid = "none";
    else if (fr.unlock === "admin" && !isAdmin()) fid = "none";
    if (fid === "none" && !state.frameNone) fid = "r-" + cultivationIndex();
    return fid;
  }
  function profileAvatar(px) {
    return renderPfp(state.userName, state.avatarId, myFrameId(), px);
  }

  // src/ui.ts
  var TABS = ["home", "learn", "shop", "entertainment", "tasks", "utilities", "community", "wallet"];
  var ui = {
    tab: "home",
    learnStage: "language",
    selectedBookSeries: "",
    slide: 0,
    utilCat: "all",
    shopCat: "all",
    shopPay: "money",
    courseLang: "en",
    shopSub: "",
    shopSort: "smart",
    xuAfford: false,
    shopQuery: "",
    historyFilter: "all",
    openComments: /* @__PURE__ */ new Set(),
    draft: "",
    draftTag: "Chung",
    match: { lang: "en", level: 1, goal: "Giao ti\u1EBFp", searched: false },
    quiz: null,
    flash: null,
    dialog: null,
    pomo: { running: false, remaining: 25 * 60, mode: "focus", sessions: 0 },
    volume: 50,
    profileTab: "avatar",
    avatarCategory: "streak",
    renderModal: null,
    modalSide: false
  };
  var toastTimer;
  function toast(message) {
    const el = $("#toast");
    const msg = $("#toast-message");
    if (!el || !msg) return;
    msg.textContent = message;
    el.classList.remove("opacity-0", "pointer-events-none");
    if (toastTimer !== void 0) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.add("opacity-0", "pointer-events-none"), 2600);
  }
  // Hoãn một nhịp để cảnh báo không bị toast của chính thao tác vừa lưu ghi đè.
  window.addEventListener("windtp:save-failed", () => {
    window.setTimeout(() => toast("Không lưu được dữ liệu: bộ nhớ trình duyệt đã đầy hoặc bị chặn. Hãy xóa bớt ảnh/sản phẩm cũ."), 150);
  });
  function openModal(render, side = false) {
    ui.renderModal = render;
    ui.modalSide = side;
    refreshModal();
  }
  function refreshModal() {
    const host = $("#modal-host");
    if (!host) return;
    if (!ui.renderModal) {
      host.classList.add("hidden");
      host.innerHTML = "";
      return;
    }
    const body = ui.renderModal();
    host.className = ui.modalSide ? "fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-end" : "fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4";
    const panel = ui.modalSide ? "bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl slide-in flex flex-col" : "bg-white w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl pop-in";
    host.innerHTML = `<div data-modal-bg class="absolute inset-0"></div><div role="dialog" aria-modal="true" class="relative ${panel}">${body}</div>`;
    host.querySelector("[data-autofocus]")?.focus();
  }
  function closeModal() {
    ui.renderModal = null;
    ui.quiz = null;
    ui.flash = null;
    ui.dialog = null;
    refreshModal();
  }
  function modalHead(title) {
    return `<div class="flex justify-between items-center border-b border-slate-100 px-5 py-3.5 sticky top-0 bg-white z-10">
    <h3 class="font-extrabold text-slate-800 text-base">${title}</h3>
    <button data-action="close-modal" class="text-slate-400 hover:text-slate-600 text-2xl leading-none px-1" aria-label="\u0110\xF3ng">&times;</button>
  </div>`;
  }

  // src/views.ts
  function langByCode(code) {
    return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
  }
  var TONES = {
    sky: { card: "from-sky-50 to-blue-100 border-sky-200", title: "text-sky-800", sub: "text-sky-600" },
    indigo: { card: "from-indigo-50 to-purple-100 border-indigo-200", title: "text-indigo-800", sub: "text-indigo-600" },
    emerald: { card: "from-emerald-50 to-teal-100 border-emerald-200", title: "text-emerald-800", sub: "text-emerald-600" },
    rose: { card: "from-rose-50 to-pink-100 border-rose-200", title: "text-rose-800", sub: "text-rose-600" },
    amber: { card: "from-amber-50 to-orange-100 border-amber-200", title: "text-amber-800", sub: "text-amber-600" },
    teal: { card: "from-teal-50 to-cyan-100 border-teal-200", title: "text-teal-800", sub: "text-teal-600" }
  };
  var tone = (k) => TONES[k] ?? TONES.sky;
  var NAV = [
    { tab: "home", icon: "\u{1F3E0}", label: "Trang ch\u1EE7" },
    { tab: "learn", icon: "\u{1F4D6}", label: "H\u1ECDc t\u1EADp" },
    { tab: "shop", icon: "\u{1F3EA}", label: "Store" },
    { tab: "entertainment", icon: "\u{1F3AE}", label: "Gi\u1EA3i tr\xED" },
    { tab: "tasks", icon: "\u{1F3AF}", label: "Nhi\u1EC7m v\u1EE5" },
    { tab: "utilities", icon: "\u{1F9F0}", label: "Ti\u1EC7n \xEDch" },
    { tab: "community", icon: "\u{1F465}", label: "C\u1ED9ng \u0111\u1ED3ng" },
    { tab: "wallet", icon: "\u{1F45B}", label: "V\xED Xu" }
  ];
  function renderNav() {
    const bar = $("#nav-bar");
    if (!bar) return;
    bar.innerHTML = NAV.map((n) => {
      const on = ui.tab === n.tab;
      return `<button data-action="goto" data-tab="${n.tab}" aria-label="${n.label}" ${on ? 'aria-current="page"' : ""}
      class="flex-1 flex flex-col items-center py-1 px-0.5 transition-all ${on ? "text-sky-600" : "text-slate-400 hover:text-sky-600"}">
      <span class="text-lg leading-none ${on || n.tab === "wallet" ? "" : "grayscale opacity-70"}">${n.tab === "wallet" ? `<span class="wind-coin-mark" role="img" aria-label="WIND Coin" style="font-size:1.15rem;${on ? "" : "opacity:.85"}"><span class="wind-coin-mark__w">W</span></span>` : n.icon}</span>
      <span class="text-[9px] sm:text-[10px] mt-0.5 ${on ? "font-bold" : "font-medium"} whitespace-nowrap">${n.label}</span>
    </button>`;
    }).join("");
  }
  function renderHeader() {
    document.querySelectorAll('[data-bind="balance"]').forEach((el) => {
      el.textContent = fmt(state.balance);
    });
    const av = $("#header-avatar");
    if (av) av.innerHTML = profileAvatar(34);
    const nm = $("#header-name");
    if (nm) nm.textContent = state.userName;
    const dot = $("#notice-dot");
    if (dot) {
      const unread = state.notices.filter((n) => !n.read).length;
      dot.textContent = unread > 9 ? "9+" : String(unread);
      dot.classList.toggle("hidden", unread === 0 || !state.settings.push);
      dot.classList.toggle("flex", unread > 0 && state.settings.push);
    }
  }
  var BANNERS = [
    { cls: "hb-g1", tag: "Khóa học + Premium", title: "Mua sắm khóa học để mở khóa Premium và nhận chip", text: "7 ngôn ngữ, gói từ 1 tháng đến vĩnh viễn, tặng chip game theo từng gói.", btn: "Xem khóa học", btnCls: "text-fuchsia-700", act: "open-courses", emoji: "👑", sub: "text-pink-100", fx: ["🎰", "✨", "🪙"] },
    { cls: "hb-g2", tag: "WIND Store", title: "Mua sắm mọi thứ ở WIND Store", text: "Thời trang, đồ ăn, công nghệ, thuốc và thực phẩm chức năng, khóa học, tài liệu.", btn: "Vào cửa hàng", btnCls: "text-rose-700", tab: "shop", emoji: "🛍️", sub: "text-orange-100", fx: ["🎁", "🛒", "✨"] },
    { cls: "hb-g3", tag: "Giải trí và Kết bạn", title: "Giải trí và thách đấu cùng bạn bè", text: "Chơi game, tìm đồng đội cùng học và thách đấu bạn bè để lên hạng.", btn: "Chơi ngay", btnCls: "text-teal-700", tab: "entertainment", emoji: "🎮", sub: "text-emerald-100", fx: ["⚔️", "🏆", "🎵"] },
    { cls: "hb-g4", tag: "Nhiệm vụ mỗi ngày", title: "Hoàn thành nhiệm vụ để nhận ngay WIND Coin và chip", text: "Điểm danh, học bài, chơi game mỗi ngày để nhận thưởng.", btn: "Làm nhiệm vụ", btnCls: "text-orange-700", tab: "tasks", emoji: "🎯", sub: "text-amber-100", fx: ["🪙", "🎰", "⭐"] },
    { cls: "hb-g5", tag: "Tiện ích", title: "Tìm kiếm việc làm, nhà ở và mua bán đồ cũ", text: "Đăng tin và tra cứu việc làm sinh viên, phòng trọ, chợ đồ cũ.", btn: "Tra cứu ngay", btnCls: "text-indigo-700", tab: "utilities", emoji: "🏠", sub: "text-indigo-100", fx: ["💼", "🛵", "🔍"] }
  ];
  function bnAttr(b) { return b.act ? `data-action="${b.act}"` : `data-action="goto" data-tab="${b.tab}"${b.cat ? ` data-cat="${b.cat}"` : ""}`; }
  function bnFx(b) { return `<div class="hb-fx" aria-hidden="true">${b.fx.map((e, i) => `<span style="left:${18 + i * 26}%;bottom:${6 + (i % 2) * 14}%;animation-delay:${i * 1.3}s">${e}</span>`).join("")}</div><i class="hb-orb" style="width:70px;height:70px;right:-14px;top:-18px"></i><i class="hb-orb" style="width:44px;height:44px;left:38%;bottom:-16px;animation-delay:-2s"></i>`; }
  var SHORTCUTS = [
    { tab: "learn", emoji: "\u{1F4D6}", label: "H\u1ECDc t\u1EADp", grad: "from-sky-400 to-blue-500" },
    { tab: "shop", emoji: "\u{1F3EA}", label: "WIND Store", grad: "from-indigo-400 to-purple-500" },
    { tab: "entertainment", emoji: "\u{1F3AE}", label: "Gi\u1EA3i tr\xED", grad: "from-purple-400 to-pink-500" },
    { tab: "tasks", emoji: "\u{1F3AF}", label: "Nhi\u1EC7m v\u1EE5", grad: "from-emerald-400 to-teal-600" },
    { tab: "utilities", emoji: "\u{1F9F0}", label: "Ti\u1EC7n \xEDch", grad: "from-teal-400 to-cyan-600" },
    { tab: "community", emoji: "\u{1F465}", label: "C\u1ED9ng \u0111\u1ED3ng", grad: "from-rose-400 to-pink-500" },
    { tab: "wallet", emoji: "\u{1FA99}", label: "V\xED Xu", grad: "from-amber-400 to-orange-500" }
  ];
  function taskSummary() {
    const list = tasks();
    return { done: list.filter((t) => t.progress() >= t.goal).length, total: list.length, claimed: list.filter((t) => state.daily.claimed.includes(t.id)).length };
  }
  function renderHome() {
    const el = $("#tab-home");
    if (!el) return;
    const ts = taskSummary();
    const pct = Math.round(ts.claimed / ts.total * 100);
    el.innerHTML = `
  <div class="relative overflow-hidden rounded-2xl shadow-md border border-white/60" id="banner-wrap">
    <div id="banner-slider" class="flex transition-transform duration-500 ease-out" style="transform:translateX(-${ui.slide * 100}%)">
      ${BANNERS.map((b) => `
      <div class="min-w-full hb-slide ${b.cls} p-4 sm:p-5 text-white keep-white flex justify-between items-center h-[140px] sm:h-[150px] relative">
        ${bnFx(b)}
        <div class="space-y-1 z-10 max-w-[74%] relative">
          <span class="bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">${b.tag}</span>
          <h3 class="font-extrabold text-sm sm:text-lg leading-snug">${b.title}</h3>
          <p class="text-xs ${b.sub} line-clamp-1">${b.text}</p>
          <button ${bnAttr(b)} class="hb-btn mt-1 bg-white keep-white ${b.btnCls} text-xs font-bold px-3 py-1 rounded-lg shadow-sm transition-transform active:scale-95">${b.btn}</button>
        </div>
        <div class="hb-emoji text-5xl sm:text-6xl pr-2 select-none relative z-10">${b.emoji}</div>
      </div>`).join("")}
    </div>
    <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
      ${BANNERS.map((_, i) => `<button data-action="set-banner" data-i="${i}" aria-label="Banner ${i + 1}" class="banner-dot h-2 rounded-full keep-white transition-all ${i === ui.slide ? "w-4 bg-white" : "w-2 bg-white/50"}"></button>`).join("")}
    </div>
  </div>

  <div class="grid grid-cols-4 sm:grid-cols-7 gap-3 text-center">
    ${SHORTCUTS.map((s, i) => `
    <button data-action="goto" data-tab="${s.tab}" ${s.cat ? `data-cat="${s.cat}"` : ""} class="glass-card p-3 rounded-2xl hover:bg-white transition-all group flex flex-col items-center ${i === 6 ? "col-span-2 sm:col-span-1" : ""}">
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr ${s.grad} text-white keep-white flex items-center justify-center text-xl mb-1.5 group-hover:scale-105 transition-transform modern-icon-badge">${s.emoji}</div>
      <span class="text-xs font-bold text-slate-700">${s.label}</span>
    </button>`).join("")}
  </div>

  <button data-action="goto" data-tab="tasks" class="glass-card w-full p-3.5 rounded-2xl text-left hover:shadow-md transition-all">
    <div class="flex items-center justify-between text-xs mb-2">
      <span class="font-bold text-slate-800">\u{1F3AF} Nhi\u1EC7m v\u1EE5 h\xF4m nay: ${ts.claimed}/${ts.total} \u0111\xE3 nh\u1EADn${ts.done > ts.claimed ? `, ${ts.done - ts.claimed} \u0111ang ch\u1EDD nh\u1EADn` : ""}</span>
      <span class="text-sky-600 font-semibold">Xem &rarr;</span>
    </div>
    <div class="h-2 rounded-full bg-slate-200 overflow-hidden"><div class="h-full bg-gradient-to-r from-sky-400 to-emerald-500 rounded-full transition-all" style="width:${pct}%"></div></div>
  </button>

  <section id="wind-vocab-card" class="wd-glowcard glass-card p-4 sm:p-5 rounded-2xl border border-sky-100 shadow-sm space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2"><span class="wd-iconpulse w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center">${ICON_TRANSLATE}</span> Tra cứu từ vựng</h2>
        <p class="text-xs text-slate-500 mt-1">Dịch qua lại giữa tiếng Việt và 7 ngôn ngữ · Có phát âm</p>
      </div>
      <span class="text-[10px] font-bold bg-sky-50 text-sky-700 px-2 py-1 rounded-full">8 ngôn ngữ</span>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-end">
      <label class="block text-xs font-bold text-slate-600">Ngôn ngữ nguồn
        <select id="vocab-from" class="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-300">
          <option value="vi" selected>🇻🇳 Tiếng Việt</option><option value="en">🇺🇸 Tiếng Anh</option><option value="ko">🇰🇷 Tiếng Hàn</option><option value="ja">🇯🇵 Tiếng Nhật</option><option value="zh-CN">🇨🇳 Tiếng Trung</option><option value="fr">🇫🇷 Tiếng Pháp</option><option value="de">🇩🇪 Tiếng Đức</option><option value="es">🇪🇸 Tiếng Tây Ban Nha</option>
        </select>
      </label>
      <button type="button" id="vocab-swap" class="rounded-xl border border-sky-200 bg-sky-50 text-sky-700 px-3 py-2.5 font-bold hover:bg-sky-100" aria-label="Đổi chiều dịch">⇄</button>
      <label class="block text-xs font-bold text-slate-600">Ngôn ngữ đích
        <select id="vocab-to" class="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-300">
          <option value="vi">🇻🇳 Tiếng Việt</option><option value="en" selected>🇺🇸 Tiếng Anh</option><option value="ko">🇰🇷 Tiếng Hàn</option><option value="ja">🇯🇵 Tiếng Nhật</option><option value="zh-CN">🇨🇳 Tiếng Trung</option><option value="fr">🇫🇷 Tiếng Pháp</option><option value="de">🇩🇪 Tiếng Đức</option><option value="es">🇪🇸 Tiếng Tây Ban Nha</option>
        </select>
      </label>
    </div>
    <label class="block text-xs font-bold text-slate-600">Từ hoặc câu cần dịch
      <textarea id="vocab-input" rows="3" maxlength="500" placeholder="Nhập từ vựng hoặc câu cần dịch..." class="mt-1 w-full resize-y rounded-xl border border-sky-200 bg-white px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"></textarea>
    </label>
    <div class="flex flex-wrap gap-2">
      <button type="button" id="vocab-translate" class="flex-1 min-w-[150px] rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:brightness-105">🔎 Dịch ngay</button>
      <button type="button" id="vocab-speak-source" class="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-bold text-sky-700">🔊 Nghe từ gốc</button>
      <button type="button" id="vocab-clear" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600">Xóa</button>
    </div>
    <div id="vocab-result-wrap" class="hidden rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-2">
      <div class="flex items-center justify-between gap-2"><span class="text-xs font-bold text-emerald-800">Kết quả dịch</span><button type="button" id="vocab-speak-result" class="rounded-lg bg-white border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">🔊 Nghe phát âm</button></div>
      <p id="vocab-result" class="text-base sm:text-lg font-bold text-slate-800 whitespace-pre-wrap break-words"></p>
      <p id="vocab-status" class="text-[11px] text-slate-500"></p>
    </div>
    <p id="vocab-error" class="hidden text-xs text-rose-600" role="status"></p>
    <p class="text-[10px] text-slate-400">Dịch cần kết nối Internet; phát âm sử dụng giọng đọc có sẵn trên thiết bị/trình duyệt.</p>
  </section>

  <section id="wind-cultivation-card" class="relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-lg border-0 text-white keep-white" style="background:linear-gradient(135deg,#6d28d9,#c026d3 55%,#f59e0b)">
    <div class="wd-aurora" aria-hidden="true"></div><div class="wd-orbit" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i></div>
    <div class="relative flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div class="flex-1"><div class="mb-2">${windLogo(64)}</div><p class="text-[10px] font-black tracking-[.2em] opacity-90">WINDTP · ÔN TẬP MỖI NGÀY</p><h2 class="text-xl sm:text-2xl font-black mt-1">Ôn tập mỗi ngày</h2><p class="text-xs mt-1 opacity-90">Chọn ngôn ngữ rồi ôn ngay tại đây: từ vựng, ngữ pháp và 4 kỹ năng.</p></div>
      <div class="flex flex-col sm:min-w-[230px] gap-2"><label for="learn-home-language" class="text-xs font-extrabold">Ngôn ngữ ôn tập</label><select id="learn-home-language" class="w-full rounded-xl px-3 py-2.5 bg-white text-slate-800 font-bold text-sm border-0 shadow-md">${LANGUAGES.map(l => `<option value="${l.code}" ${l.code === (state.lang || 'en') ? 'selected' : ''}>${l.flag} ${l.name}</option>`).join('')}</select><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"><button data-action="home-review" data-mode="vocab" class="rounded-xl bg-white px-2 py-2.5 text-xs font-black shadow-lg hover:scale-[1.02] transition-transform" style="color:#6d28d9">📖<br>Từ vựng</button><button data-action="home-review" data-mode="grammar" class="rounded-xl bg-white px-2 py-2.5 text-xs font-black shadow-lg hover:scale-[1.02] transition-transform" style="color:#6d28d9">✍️<br>Ngữ pháp</button><button data-action="home-review" data-mode="practice" class="rounded-xl bg-white px-2 py-2.5 text-xs font-black shadow-lg hover:scale-[1.02] transition-transform" style="color:#6d28d9">🎧<br>4 kỹ năng</button></div><button data-action="home-open-cultivation" class="text-[11px] font-bold underline opacity-90">Mở không gian học đầy đủ →</button></div>
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-base font-bold text-slate-800 flex items-center gap-2"><span class="w-2 h-5 bg-fuchsia-500 rounded-full"></span> Khám phá WINDTP</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      ${BANNERS.map((b, i) => `
      <button ${bnAttr(b)} class="hb-slide hb-card ${b.cls} text-left text-white keep-white ${i === BANNERS.length - 1 ? "sm:col-span-2" : ""}">
        ${bnFx(b)}
        <span class="hb-num">${i + 1}</span>
        <div class="relative z-10 flex items-center gap-3">
          <div class="min-w-0 flex-1 space-y-1">
            <span class="inline-block bg-white/25 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">${b.tag}</span>
            <h3 class="font-extrabold text-sm sm:text-base leading-snug">${b.title}</h3>
            <p class="text-xs ${b.sub}">${b.text}</p>
            <span class="inline-block mt-1 text-xs font-extrabold">${b.btn} →</span>
          </div>
          <div class="hb-emoji text-5xl shrink-0 select-none">${b.emoji}</div>
        </div>
      </button>`).join("")}
    </div>
  </section>`;
  }
  var BOOK_CATALOG = {
    en: [
      ["IELTS 2.0", "from-slate-800 to-slate-600", ["Book 5", "Books 6–7", "Books 8–9"]],
      ["IELTS", "from-emerald-600 to-teal-400", ["Book 1", "Book 2"]],
      ["TOEIC", "from-blue-800 to-sky-500", ["Book 1", "Book 2"]],
      ["TOEFL", "from-violet-700 to-indigo-400", ["Book 1", "Book 2"]],
      ["English File", "from-indigo-600 to-blue-500", ["Starter", "Elementary", "Pre-Intermediate", "Intermediate", "Upper-Intermediate", "Advanced"]],
      ["New Headway", "from-sky-600 to-cyan-400", ["Beginner", "Elementary", "Pre-Intermediate", "Intermediate", "Upper-Intermediate", "Advanced"]],
      ["Interchange", "from-rose-600 to-orange-400", ["Intro", "Level 1", "Level 2", "Level 3"]],
      ["Từ vựng theo chủ đề", "from-amber-500 to-orange-300", ["Tổng hợp"]],
      ["Cấu trúc ngữ pháp", "from-slate-700 to-slate-500", ["Quyển 1", "Quyển 2", "Quyển 3", "Quyển 4", "Quyển 5", "Quyển 6"]]
    ],
    ko: [
      ["Tiếng Hàn tổng hợp", "from-rose-600 to-pink-400", ["Quyển 1", "Quyển 2", "Quyển 3", "Quyển 4", "Quyển 5", "Quyển 6"]],
      ["Seoul Korean", "from-orange-600 to-amber-300", ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B", "5A", "5B", "6A", "6B"]],
      ["Yonsei Korean", "from-blue-700 to-sky-400", ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "5-1", "5-2", "6-1", "6-2"]],
      ["Yonsei Reading / Listening", "from-cyan-700 to-teal-400", ["Reading/Listening 1", "Reading/Listening 2", "Reading/Listening 3", "Reading/Listening 4", "Reading/Listening 5", "Reading/Listening 6"]],
      ["EPS-TOPIK", "from-sky-700 to-blue-400", ["Tập 1 · Bài 1–10", "Tập 2 · Bài 11–20", "Tập 3 · Bài 21–30", "Tập 4 · Bài 31–40", "Tập 5 · Bài 41–50", "Tập 6 · Bài 51–60"]],
      ["TOPIK I", "from-emerald-700 to-lime-400", ["Luyện thi TOPIK I"]],
      ["TOPIK II", "from-violet-700 to-fuchsia-400", ["Luyện thi TOPIK II"]],
      ["Từ vựng theo chủ đề", "from-amber-500 to-orange-300", ["Tổng hợp"]],
      ["Cấu trúc ngữ pháp", "from-slate-700 to-slate-500", ["Quyển 1", "Quyển 2", "Quyển 3", "Quyển 4", "Quyển 5", "Quyển 6"]]
    ],
    ja: [
      ["Nihongo", "from-red-700 to-rose-400", ["Sơ cấp 1", "Sơ cấp 2", "Trung cấp 1", "Trung cấp 2"]],
      ["Mimikara Nomi", "from-blue-700 to-cyan-400", ["N5", "N4", "N3", "N2", "N1"]],
      ["Shin Kanzen – Từ vựng Shen", "from-emerald-700 to-lime-400", ["Shen N5", "Shen N4", "Shen N3", "Shen N2", "Shen N1"]],
      ["Genki", "from-orange-500 to-amber-300", ["Genki I", "Genki II"]],
      ["TRY!", "from-rose-600 to-pink-400", ["TRY! N5", "TRY! N4", "TRY! N3", "TRY! N2", "TRY! N1"]],
      ["Quartet", "from-indigo-700 to-violet-400", ["Quartet I", "Quartet II"]],
      ["Từ vựng theo chủ đề", "from-amber-500 to-orange-300", ["Tổng hợp"]],
      ["Từ Hán (Kanji)", "from-slate-700 to-slate-500", ["Hán tự tổng hợp"]],
      ["Cấu trúc ngữ pháp", "from-slate-700 to-slate-500", ["N5", "N4", "N3", "N2", "N1", "Nâng cao"]]
    ],
    fr: [
      ["Alter Ego", "from-rose-600 to-orange-300", ["A1", "A2", "B1", "B2"]],
      ["Édito", "from-blue-700 to-sky-400", ["A1", "A2", "B1", "B2", "C1"]],
      ["Cosmopolite", "from-violet-700 to-fuchsia-400", ["A1", "A2", "B1", "B2", "C1"]],
      ["Từ vựng theo chủ đề", "from-amber-500 to-orange-300", ["Tổng hợp"]],
      ["Cấu trúc ngữ pháp", "from-slate-700 to-slate-500", ["Quyển 1", "Quyển 2", "Quyển 3", "Quyển 4", "Quyển 5", "Quyển 6"]]
    ],
    es: [
      ["Aula Internacional", "from-red-700 to-orange-400", ["A1", "A2", "B1", "B2", "C1"]],
      ["Nuevo Prisma", "from-violet-700 to-pink-400", ["A1", "A2", "B1", "B2", "C1", "C2"]],
      ["Nuevo Español sin Fronteras", "from-sky-700 to-cyan-400", ["A1", "A1–A2", "A2", "B1", "B2"]],
      ["Từ vựng theo chủ đề", "from-amber-500 to-orange-300", ["Tổng hợp"]],
      ["Cấu trúc ngữ pháp", "from-slate-700 to-slate-500", ["Quyển 1", "Quyển 2", "Quyển 3", "Quyển 4", "Quyển 5", "Quyển 6"]]
    ],
    zh: [
      ["Giáo trình Hán ngữ", "from-emerald-700 to-teal-400", ["Tập 1", "Tập 2", "Tập 3", "Tập 4", "Tập 5", "Tập 6"]],
      ["HSK Standard Course", "from-blue-700 to-cyan-400", ["Standard 1", "Standard 2", "Standard 3", "Standard 4", "Standard 5", "Standard 6"]],
      ["New HSK Course", "from-rose-700 to-red-400", ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6", "HSK 7.1", "HSK 7.2", "HSK 7.3", "HSK 7.4", "HSK 7.5", "HSK 7.6", "HSK 8.1", "HSK 8.2", "HSK 8.3", "HSK 8.4", "HSK 8.5", "HSK 8.6", "HSK 8.7", "HSK 9.1", "HSK 9.2", "HSK 9.3", "HSK 9.4", "HSK 9.5", "HSK 9.6", "HSK 9.7"]],
      ["Boya Chinese", "from-indigo-700 to-violet-400", ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2", "4-3"]],
      ["Develop Chinese", "from-sky-700 to-blue-400", ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2"]],
      ["Từ vựng theo chủ đề", "from-amber-500 to-orange-300", ["Tổng hợp"]],
      ["Cấu trúc ngữ pháp", "from-slate-700 to-slate-500", ["Quyển 1", "Quyển 2", "Quyển 3", "Quyển 4", "Quyển 5", "Quyển 6"]]
    ],
    de: [
      ["Menschen", "from-orange-600 to-amber-300", ["A1", "A2", "B1"]],
      ["Schritte International", "from-emerald-700 to-lime-400", ["A1", "A2", "B1"]],
      ["Netzwerk Neu", "from-sky-700 to-cyan-400", ["A1", "A2", "B1"]],
      ["Studio 21", "from-rose-700 to-pink-400", ["A1", "A2", "B1"]],
      ["Aspekte Neu", "from-indigo-700 to-violet-400", ["B1+", "B2", "C1"]],
      ["Từ vựng theo chủ đề", "from-amber-500 to-orange-300", ["Bộ từ vựng tổng hợp"]],
      ["Cấu trúc ngữ pháp", "from-slate-700 to-slate-500", ["Quyển 1", "Quyển 2", "Quyển 3", "Quyển 4", "Quyển 5", "Quyển 6"]]
    ]
  };
  function bookGradient(tokens) {
    const colors = {
      "indigo-600":"#4f46e5", "blue-500":"#3b82f6", "sky-600":"#0284c7", "cyan-400":"#22d3ee",
      "rose-600":"#e11d48", "orange-400":"#fb923c", "slate-800":"#1e293b", "slate-600":"#475569",
      "emerald-600":"#059669", "teal-400":"#2dd4bf", "blue-800":"#1e40af", "sky-500":"#0ea5e9",
      "violet-700":"#6d28d9", "indigo-400":"#818cf8", "amber-500":"#f59e0b", "orange-300":"#fdba74",
      "slate-700":"#334155", "slate-500":"#64748b", "blue-700":"#1d4ed8", "sky-400":"#38bdf8",
      "cyan-700":"#0e7490", "teal-400":"#2dd4bf", "orange-600":"#ea580c", "amber-300":"#fcd34d",
      "emerald-700":"#047857", "lime-400":"#a3e635", "fuchsia-400":"#e879f9", "sky-700":"#0369a1",
      "rose-700":"#be123c", "pink-400":"#f472b6", "indigo-700":"#4338ca", "purple-400":"#c084fc",
      "red-700":"#b91c1c", "red-400":"#f87171", "violet-400":"#a78bfa", "pink-400":"#f472b6",
      "orange-500":"#f97316", "yellow-300":"#fde047", "blue-400":"#60a5fa", "sky-700":"#0369a1",
      "fuchsia-400":"#e879f9", "rose-400":"#fb7185", "cyan-400":"#22d3ee", "teal-400":"#2dd4bf"
    };
    const m = String(tokens || "").match(/from-([\w-]+)\s+to-([\w-]+)/);
    if (!m) return "linear-gradient(135deg,#4f46e5,#0ea5e9)";
    return `linear-gradient(135deg,${colors[m[1]] || '#4f46e5'},${colors[m[2]] || '#0ea5e9'})`;
  }
  var ICON_REVIEW = `<svg width="60" height="60" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="icLt1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f472b6"/><stop offset=".55" stop-color="#fbcfe8"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="icLt2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ec4899"/><stop offset="1" stop-color="#fce7f3"/></linearGradient><linearGradient id="icLt3" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ec4899"/><stop offset="1" stop-color="#fce7f3"/></linearGradient><linearGradient id="icLt4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f9a8d4"/><stop offset="1" stop-color="#fff1f2"/></linearGradient><linearGradient id="icLt5" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9a8d4"/><stop offset="1" stop-color="#fff1f2"/></linearGradient><radialGradient id="icLt6" cx=".4" cy=".35"><stop offset="0" stop-color="#86efac"/><stop offset="1" stop-color="#15803d"/></radialGradient><radialGradient id="icLt7"><stop offset="0" stop-color="#fef08a"/><stop offset="1" stop-color="#f59e0b"/></radialGradient></defs><ellipse cx="32" cy="55" rx="28" ry="6" fill="#67e8f9" opacity=".35"/><ellipse cx="32" cy="55" rx="22" ry="4" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1"/><path d="M4 52c0-4 8-6 14-4 4 1 6 3 6 5-4 3-20 4-20-1z" fill="url(#icLt6)"/><path d="M60 52c0-4-8-6-14-4-4 1-6 3-6 5 4 3 20 4 20-1z" fill="url(#icLt6)"/><path d="M8 50l9 0" stroke="#bbf7d0" stroke-width=".9" opacity=".7"/><path d="M32 51C14 49 5 36 7 23c13 2 24 13 25 28z" fill="url(#icLt2)"/><path d="M32 51C50 49 59 36 57 23 44 25 33 36 32 51z" fill="url(#icLt3)"/><path d="M32 51C19 47 13 33 17 17c10 6 15 20 15 34z" fill="url(#icLt4)"/><path d="M32 51C45 47 51 33 47 17 37 23 32 37 32 51z" fill="url(#icLt5)"/><path d="M32 51C23 40 23 22 32 7c9 15 9 33 0 44z" fill="url(#icLt1)"/><g fill="none" stroke="#ec4899" stroke-opacity=".45" stroke-width=".9" stroke-linecap="round"><path d="M32 48c-3-11-3-24 0-37M32 48c-5-9-6-19-4-28M32 48c5-9 6-19 4-28M30 50C22 44 15 33 14 24M34 50c8-6 15-17 16-26M30 50C18 46 10 37 9 28M34 50c12-4 20-13 21-22"/></g><path d="M27 19c-2 6-2 14 1 22" stroke="#fff" stroke-opacity=".75" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="49" rx="6" ry="2.6" fill="url(#icLt7)"/><g fill="#fcd34d"><circle cx="28.5" cy="48" r="1"/><circle cx="32" cy="46.8" r="1"/><circle cx="35.5" cy="48" r="1"/></g><circle cx="13" cy="51" r="1.8" fill="#fff" opacity=".85"/><path d="M52 8l1.2 3.2L56.5 12.4l-3.3 1.2L52 17l-1.2-3.4-3.3-1.2 3.3-1.2z" fill="#fde047"/><path d="M11 10l.9 2.4 2.4.9-2.4.9L11 16.6l-.9-2.4-2.4-.9 2.4-.9z" fill="#fff" opacity=".9"/></svg>`;
  var ICON_EXAM = `<svg width="60" height="60" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="icEx1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fcd34d"/><stop offset="1" stop-color="#ea580c"/></linearGradient><linearGradient id="icEx2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fda4af"/><stop offset="1" stop-color="#be185d"/></linearGradient><linearGradient id="icEx3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7ad"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs><path d="M6 27Q20 21 32 29V58Q20 50 6 56Z" fill="url(#icEx1)"/><path d="M58 27Q44 21 32 29V58Q44 50 58 56Z" fill="url(#icEx2)"/><path d="M11 33Q20 30 28 35M11 39Q20 36 28 41M11 45Q20 42 28 47" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/><path d="M53 33Q44 30 36 35M53 39Q44 36 36 41M53 45Q44 42 36 47" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/><path d="M32 29V58" stroke="#7c2d12" stroke-opacity=".45" stroke-width="1.5"/><circle cx="32" cy="14" r="12" fill="#fde047" fill-opacity=".28"/><polygon points="32.0,3.0 34.5,9.5 41.5,9.9 36.1,14.3 37.9,21.1 32.0,17.3 26.1,21.1 27.9,14.3 22.5,9.9 29.5,9.5" fill="url(#icEx3)" stroke="#d97706" stroke-width="1" stroke-linejoin="round"/><polygon points="55.0,6.5 55.8,8.9 58.3,8.9 56.2,10.4 57.1,12.8 55.0,11.3 52.9,12.8 53.8,10.4 51.7,8.9 54.2,8.9" fill="#fff7ad"/></svg>`;
