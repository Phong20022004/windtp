  // ===== Game bàn bài lá: Quần hùng hội tụ · Long Tranh Hổ Đấu =====
  var bblEl = null;
  function bblCard() {
    const fl = [["♠", 6, 7, 0], ["♥", 17, 8.5, -2], ["♦", 29, 6.5, -4], ["♣", 41, 9, -1], ["🪙", 53, 7.5, -3], ["♠", 64, 6.8, -5], ["♥", 76, 8, -2.5], ["♦", 88, 7.2, -4.5], ["🪙", 95, 9, -1.5]];
    return `<div class="bbl-card" data-action="open-bbl" role="button" tabindex="0" aria-label="Quần hùng hội tụ, Long Tranh Hổ Đấu: mở game bàn bài lá">
      <div class="bbl-bg" aria-hidden="true"><i class="bbl-glow"></i>${fl.map((f) => `<s class="${f[0] === "♥" || f[0] === "♦" ? "r" : ""}" style="left:${f[1]}%;--d:${f[2]}s;--t:${f[3]}s">${f[0]}</s>`).join("")}</div>
      <div class="bbl-body">
        <div class="bbl-art" aria-hidden="true"><i class="ba-i"></i><i class="ba-mist m1"></i><i class="ba-mist m2"></i><i class="ba-gl dr"></i><i class="ba-gl tg"></i><i class="ba-rg dr"></i><i class="ba-rg tg"></i><i class="ba-sw"></i><i class="ba-bk">⚡</i></div>
        
        <h3 class="bbl-title">QUẦN HÙNG HỘI TỤ<b>LONG TRANH HỔ ĐẤU</b></h3>
        <p class="bbl-names" aria-hidden="true"><em class="tl">青龍 Thanh Long</em><i>⚔</i><em class="bh">Bạch Hổ 白虎</em></p>
        <p class="bbl-sub">Tiến lên · Phỏm · Ba cây · Liêng · Poker · Cờ vua · Cờ tướng · Quay may mắn</p>
        <div class="bbl-foot"><span class="bbl-chip">\u{1F3B0} Chip game: <b data-bbl-chips>${fmt(state.chips || 0)}</b></span><span class="bbl-cta">Vào bàn ▶</span></div>
      </div></div>`;
  }
  function bblRefresh() {
    const n = fmt(state.chips || 0);
    document.querySelectorAll("[data-bbl-chips]").forEach((e) => { if (e.textContent !== n) e.textContent = n; });
    const t = document.getElementById("bbl-top-chips");
    if (t) t.textContent = "\u{1F3B0} " + n;
    try { const w = bblEl && bblEl.querySelector("iframe").contentWindow; if (w && w.__bblChips) w.__bblChips(Number(state.chips || 0)); } catch (e) { }
  }
  function bblBurst(el) {
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, em = ["\u{1F0CF}", "♠", "♥", "♦", "♣", "\u{1FA99}", "\u{1F409}", "\u{1F405}"];
    for (let i = 0; i < 14; i++) {
      const p = document.createElement("span"), a = Math.PI * 2 * i / 14, d = 70 + Math.random() * 90;
      p.className = "bbl-p"; p.textContent = em[i % em.length];
      p.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--r:${(Math.random() * 360) | 0}deg`;
      document.body.appendChild(p); setTimeout(() => p.remove(), 950);
    }
  }
  function openBbl() {
    if (!window.__BBL_HTML) { toast("Không tải được game bàn bài"); return; }
    if (!bblEl) {
      bblEl = document.createElement("div"); bblEl.id = "bbl-host";
      bblEl.innerHTML = `<div class="bbl-top"><b>\u{1F409} Quần hùng hội tụ · Long Tranh Hổ Đấu \u{1F405}</b><span id="bbl-top-chips"></span><button type="button" aria-label="Đóng game">✕ Đóng</button></div><iframe class="bbl-if" title="Long Tranh Hổ Đấu" allow="autoplay; clipboard-write"></iframe>`;
      document.body.appendChild(bblEl);
      bblEl.querySelector("iframe").srcdoc = window.__BBL_HTML;
      bblEl.querySelector("button").onclick = closeBbl;
    }
    document.body.style.overflow = "hidden"; document.documentElement.classList.add("bbl-open"); bblRefresh();
  }
  function closeBbl() {
    if (!bblEl) return;
    try { bblEl.querySelector("iframe").contentWindow.__bblFlush(); } catch (e) { }
    bblEl.remove(); bblEl = null; document.body.style.overflow = ""; document.documentElement.classList.remove("bbl-open");
    refreshFriends();
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && bblEl && !ui.renderModal) closeBbl();
    if ((e.key === "Enter" || e.key === " ") && e.target && e.target.classList && e.target.classList.contains("bbl-card")) { e.preventDefault(); e.target.click(); }
  });
  function collectPfpCss() {
    if (window.__pfpCssCache) return window.__pfpCssCache;
    const re = /\.(pfp|rframe|rf\d|rfp-|rfs\d|rfpm-|rfadm|rf-|rk\d?|rk-big|cultivation-badge|frame-|adm-)/, kre = /^(rf-|rk|adm|frame-)/;
    const walk = (rules) => { let o = ""; for (const r of rules) { try { if (r.type === 1) { if (re.test(r.selectorText)) o += r.cssText + "\n"; } else if (r.type === 4) { const i = walk(r.cssRules); if (i) o += "@media " + r.conditionText + "{" + i + "}\n"; } else if (r.type === 7) { if (kre.test(r.name)) o += r.cssText + "\n"; } } catch (e) { } } return o; };
    let out = ""; for (const sh of Array.from(document.styleSheets)) { try { out += walk(sh.cssRules); } catch (e) { } }
    window.__pfpCssCache = out; return out;
  }
  Object.assign(actions, {
    "open-bbl": (el) => { el.classList.add("bbl-go"); bblBurst(el); setTimeout(() => { el.classList.remove("bbl-go"); openBbl(); }, 280); },
    "birth-confirm": () => {
      const v = ui.birthPending || "", a = ageFromBirth(v); ui.birthPending = "";
      if ((state.settings.birth && ui.birthEdit !== 2) || a < 0 || a > 120) { refreshModal(); return; }
      state.settings.birth = v; ui.birthEdit = 0; commit(); refreshModal(); toast("Đã lưu ngày sinh · " + a + " tuổi");
    },
    "birth-cancel": () => { ui.birthPending = ""; refreshModal(); },
    "birth-edit": () => { ui.birthEdit = 1; ui.birthPending = ""; refreshModal(); },
    "birth-edit-ok": () => { ui.birthEdit = 2; refreshModal(); },
    "birth-edit-cancel": () => { ui.birthEdit = 0; ui.birthPending = ""; refreshModal(); },
    "open-lb": (el) => { ui.lbTab = el.dataset.k === "coin" ? "coin" : "chips"; openModal(lbModal); },
    "lb-tab": (el) => { ui.lbTab = el.dataset.k; refreshModal(); },
    "join-room": (el) => {
      const p = String(el.dataset.room || "").split("|");
      if (p.length !== 4 || !/^[A-Z0-9]{3,8}$/.test(p[0])) { toast("Lời mời không hợp lệ"); return; }
      closeModal();
      roomFromHash("#room=" + p[0] + "&c=" + p[1] + "-" + p[2] + "-" + p[3]);
    }
  });
  Object.assign(window.WINDTP, {
    setChips: (n) => { n = Math.max(0, Math.floor(Number(n) || 0)); if (n === Number(state.chips || 0)) return; state.chips = n; commit(); },
    plans: () => COURSE_PLANS.map((p) => ({ id: p.id, label: p.label, months: p.months, life: !!p.life, vnd: p.vnd, chips: p.chips })),
    money, MINPAY, chipRate: (c) => TOPUP_RATE[c] || 1, currency: () => state.settings.currency,
    buyChips: (cur, amt) => { { const ag = ageFromBirth(state.settings.birth); if (ag < 0) { toast("Hãy xác nhận ngày sinh trước khi mua chip."); return false; } if (ag < 18) { toast("Tài khoản dưới 18 tuổi chưa thể mua chip bằng tiền."); return false; } } ui.topup = null; ui.topupCode = null; const t = topupState(); t.src = "chip"; t.cur = TOPUP_RATE[cur] ? cur : state.settings.currency; t.amt = Math.floor(Number(amt)); const okAmt = t.amt > 0 && t.amt >= MINPAY[t.cur] && topupXu(t.cur, t.amt) <= 5e7; if (!okAmt) t.amt = TOPUP_PRESETS[t.cur][1]; t.step = okAmt ? 2 : 1; openModal(topupModal); return true; },
    presets: TOPUP_PRESETS,
    chipLimit: () => {
      const a = ageFromBirth(state.settings.birth), group = a < 0 ? "" : a < 12 ? "u12" : a < 18 ? "minor" : "adult";
      const cap = group === "minor" ? CHIP_LIM.minorDaily : group === "adult" ? CHIP_LIM.adultDaily : 0;
      const b = state.chipBuy, bought = b && b.d === todayIso() ? Number(b.n) || 0 : 0;
      return { group, cap, bought, left: Math.max(0, cap - bought) };
    },
    xuToChips: (n) => { n = Math.floor(Number(n) || 0); if (n <= 0 || n > state.balance) return false; { const L = window.WINDTP.chipLimit(); if (n > L.left) { toast(L.cap ? "Vượt giới hạn đổi chip hôm nay." : "Hãy xác nhận ngày sinh (từ 12 tuổi) trước khi đổi chip."); return false; } state.chipBuy = { d: todayIso(), n: L.bought + n }; } if (!spend(n, `Đổi ${fmt(n)} Xu sang chip game`)) return false; state.chips = Number(state.chips || 0) + n; notify("🎰", `Đã đổi ${fmt(n)} Xu thành ${fmt(n)} chip game`); commit(); return true; },
    profile: () => { const s = state.settings, b = s.birth || "", a = ageFromBirth(b); return { name: state.userName, gender: s.gender || "", birth: b, age: a >= 0 ? a : null, avatarId: state.avatarId, frameId: myFrameId(), realm: cultivationIndex(), realmName: cultivationRank().name }; },
    setProfile: (o) => { o = o || {}; const s = state.settings; let ch = false; if (["nam", "nu", "khac"].includes(o.gender) && s.gender !== o.gender) { s.gender = o.gender; ch = true; } if (typeof o.birth === "string" && !s.birth) { const a = ageFromBirth(o.birth); if (a >= 0 && a <= 120) { s.birth = o.birth; ch = true; } } if (ch) commit(); return ch; },
    pfp: (name, avatarId, frameId, px, realm, emoji) => renderPfp(name, avatarId || "default", frameId || "none", px, { realm: realm == null ? null : realm, emoji: emoji || "" }),
    myPfp: (px) => profileAvatar(px),
    pfpCss: () => collectPfpCss(),
    appUrl: () => {
      try { const s = localStorage.getItem("windtp-app-url") || ""; if (/^https?:\/\//i.test(s)) return s; } catch (e) { }
      try { const u = location.href.split("#")[0]; return /^(https?|file):/.test(u) ? u : ""; } catch (e) { return ""; }
    },
    setAppUrl: (u) => {
      u = String(u || "").trim().split("#")[0];
      if (!u) { try { localStorage.removeItem("windtp-app-url"); } catch (e) { } return true; }
      if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(u) || u.length > 300) return false;
      try { localStorage.setItem("windtp-app-url", u); } catch (e) { return false; }
      return true;
    },
    pendingRoom: () => { const h = window.__bblRoom || ""; window.__bblRoom = ""; return h; },
    inviteFriend: (id, text, room) => {
      const f = friendById(id); if (!f) return false;
      const s = socialState(), arr = s.msgs[id] || (s.msgs[id] = []);
      let inv = null;
      if (room && /^[A-Z0-9]{3,8}$/.test(String(room.id || "")) && /^[a-z0-9]{1,6}$/.test(String(room.g || "")) && Number(room.n) > 0 && Number(room.b) > 0) {
        inv = { id: String(room.id), g: String(room.g), n: Number(room.n), b: Number(room.b), name: String(room.name || "").slice(0, 40), url: /^https?:\/\/|^file:\/\//i.test(room.url || "") ? String(room.url).slice(0, 300) : "", st: "wait" };
      }
      const msg = { from: "me", t: inv ? "🎮 Lời mời chơi bài · ID " + inv.id : String(text || "").slice(0, 300), ts: Date.now() };
      if (inv) msg.inv = inv;
      arr.push(msg);
      if (arr.length > 60) arr.splice(0, arr.length - 60);
      commit();
      if (friendOnline(f) && Math.random() < f.accept) {
        const bank = ["Ok, mình vào ngay nhé! 🎮", "Chờ mình xíu, mình vào bàn liền!", "Được luôn, mình qua ngay!"];
        window.setTimeout(() => {
          const a = socialState().msgs[id] || (socialState().msgs[id] = []);
          if (inv) { const m0 = a.find((x) => x.ts === msg.ts && x.inv); if (m0) m0.inv.st = "ok"; }
          a.push({ from: f.id, t: bank[Math.floor(Math.random() * bank.length)], ts: Date.now() });
          commit(); notify("🎮", `${f.name} đã nhận lời mời chơi bài`);
          if (ui.renderModal === chatModal && ui.chat && ui.chat.type === "dm" && ui.chat.id === id) { refreshModal(); scrollChat(); }
        }, 2000 + Math.random() * 3000);
      }
      return true;
    },
    openCourses: () => { closeBbl(); openCourses(); }, buyXu: () => actions["game-buy-xu"](), gotoTasks: () => { closeBbl(); goTo("tasks"); }
  });
  listeners.push(() => { try { bblRefresh(); } catch (e) { } });
  window.setInterval(() => { socialTick(); refreshFriends(); }, 4e3);
  try { restoreGameFriends(); } catch (e) { }
  window.setInterval(friendReqTick, 1e3);
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) { try { Object.assign(state, JSON.parse(e.newValue)); listeners.forEach((fn) => fn()); challengeListeners.forEach((fn) => { try { fn(); } catch (x) { } }); } catch (x) { } }
  });
  document.addEventListener("visibilitychange", refreshFriends);

  function roomFromHash(h) {
    if (!/room=/.test(h || "")) return;
    try { if (/room=/.test(location.hash)) history.replaceState(null, "", location.href.split("#")[0]); } catch (e) { }
    if (bblEl) { try { bblEl.querySelector("iframe").contentWindow.__bblInvite(h); return; } catch (e) { } }
    window.__bblRoom = h;
    window.setTimeout(() => { if (!bblEl) openBbl(); }, 900);
  }
  window.addEventListener("hashchange", () => roomFromHash(location.hash));
  const hash0 = location.hash;
  init();
  roomFromHash(hash0);
})();

