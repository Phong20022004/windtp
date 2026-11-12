  /* ===== Khóa nội dung cho đến khi người dùng mua khóa học / Premium ===== */
  function hasCourse(code) { return Number((state.courseAccess && state.courseAccess[code]) || 0) > Date.now(); }
  function courseLockModal() {
    const lg = langByCode(ui.lockLang || state.lang || "en");
    return `${modalHead("🔒 Quyển Premium")}<div class="p-6 text-center space-y-3"><div class="text-5xl">${lg.flag}</div><p class="text-sm font-extrabold text-slate-800">Nội dung Premium · ${esc(lg.name)}</p><p class="text-xs text-slate-600">Quyển này thuộc Premium. Mua gói khóa học ${esc(lg.name)} ở WIND Store để mở khóa tất cả quyển và nhận Premium.</p><div class="flex gap-2 justify-center"><button data-action="lock-buy" data-code="${lg.code}" class="${btnPrimary}">🛒 Mua khóa học</button><button data-action="close-modal" class="${btnGhost}">Đóng</button></div></div>`;
  }
  function lockedLearnHtml(lang) {
    return `<div class="glass-card p-6 rounded-3xl text-center space-y-3"><div class="text-5xl">${lang.flag}</div><h2 class="text-lg font-black text-slate-800">🔒 Khóa học ${esc(lang.name)} đang bị khóa</h2><p class="text-sm text-slate-600">Bạn cần mua gói khóa học ${esc(lang.name)} để mở khóa nội dung học, luyện tập và các tính năng Premium.</p><div class="flex gap-2 justify-center flex-wrap"><button data-action="lock-buy" data-code="${lang.code}" class="${btnPrimary}">🛒 Mua khóa học ${esc(lang.name)}</button><button data-action="learn-back-language" class="${btnGhost}">← Đổi ngôn ngữ</button></div></div>`;
  }
  function lockWith(code) { ui.lockLang = code; openModal(courseLockModal); }
  ["open-cert", "start-cert-quiz"].forEach((n) => {
    const f = actions[n]; if (typeof f !== "function") return;
    actions[n] = function () { const c = state.lang; if (c && !hasCourse(c)) { lockWith(c); return; } return f.apply(this, arguments); };
  });
  (function () {
    const hr = actions["home-review"];
    if (typeof hr === "function") actions["home-review"] = function () { const pk = document.getElementById("learn-home-language"); const c = (pk && pk.value) || state.lang || "en"; return hr.apply(this, arguments); };
    const gl = actions["game-lang"];
    if (typeof gl === "function") actions["game-lang"] = function (el) { const c = (el && el.dataset && el.dataset.code) || "en"; if (!hasCourse(c)) { closeModal(); lockWith(c); return; } return gl.apply(this, arguments); };
    ["open-duel", "ch-play", "duel-friend"].forEach((n) => {
      const f = actions[n]; if (typeof f !== "function") return;
      actions[n] = function () { if (n === "duel-friend" && !isPremium()) return f.apply(this, arguments); if (!hasCourse("ko")) { lockWith("ko"); return; } return f.apply(this, arguments); };
    });
  })();
  function libFreeModal() {
    const v = ui.libVol; if (!v) return "";
    const lg = langByCode(v.code), g = (BOOK_CATALOG[v.code] || [])[v.g] || ["", "", []];
    return `${modalHead("🆓 " + esc(g[0]) + " · " + esc(g[2][v.v] || ""))}<div class="p-5 space-y-3 text-center"><div class="text-4xl">${lg.flag}</div><p class="text-sm font-extrabold text-slate-800">Bài 1 · Quyển 1 — miễn phí</p><p class="text-xs text-slate-600">Học thử ngay với bộ ôn tập ${esc(lg.name)}. Các quyển còn lại của giáo trình này là nội dung Premium.</p><div class="grid grid-cols-3 gap-2"><button data-action="open-vocab" class="${btnGhost}">📖 Từ vựng</button><button data-action="open-grammar" class="${btnGhost}">✍️ Ngữ pháp</button><button data-action="open-practice" class="${btnGhost}">🎧 Luyện tập</button></div><button data-action="close-modal" class="${btnPrimary}">Đóng</button></div>`;
  }
  function openLessonList(el) {
    ui.libVol = { code: el.dataset.code, g: Number(el.dataset.g), v: Number(el.dataset.v) };
    ui.learnStage = "lessons";
    renderLearn();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  Object.assign(actions, {
    "lib-free": (el) => openLessonList(el),
    "lib-premium": (el) => openLessonList(el),
    "lessons-back": () => { ui.learnStage = "library"; renderLearn(); window.scrollTo({ top: 0, behavior: "smooth" }); },
    "lesson-open": async (el) => {
      const code = el.dataset.code, g = Number(el.dataset.g), v = Number(el.dataset.v), l = Number(el.dataset.l);
      const free = v === 0 && l === 0;
      if (!free && !hasCourse(code)) { lockWith(code); return; }
      const grp = (BOOK_CATALOG[code] || [])[g];
      if (grp && DAILY_LANGS.indexOf(code) >= 0 && !window.WindtpData.vocabSync(code)) {
        toast("Đang tải bài học…");
        try { await window.WindtpData.vocab(code); } catch (e) { toast("Không tải được bài học, hãy kiểm tra mạng rồi thử lại"); return; }
      }
      if (!free && DAILY_LANGS.indexOf(code) >= 0 && !(await econEnsureFullVocab(code))) return;
      if ((code === "en" || code === "fr" || code === "zh" || code === "ko") && grp && typeof window.__enOpen === "function" && window.__enHas(grp[0] + "|" + v, v, l, code)) { if (window.__enOpen(grp[0] + "|" + v, v, l, { book: grp[0], vol: grp[2][v], lang: code })) return; }
      if (code === "de" && grp && typeof window.__deOpen === "function" && window.__deHas(grp[0] + "|" + v, v, l)) { if (window.__deOpen(grp[0] + "|" + v, v, l, { book: grp[0], vol: grp[2][v], lang: "de" })) return; }
      if (code === "ja" && grp && typeof window.__jaOpen === "function" && window.__jaHas(grp[0] + "|" + v, v, l)) { if (window.__jaOpen(grp[0] + "|" + v, v, l, { book: grp[0], vol: grp[2][v] })) return; }
      if (code === "es" && grp && typeof window.__esOpen === "function" && window.__esHas(grp[0] + "|" + v, v, l)) { if (window.__esOpen(grp[0] + "|" + v, v, l, { book: grp[0], vol: grp[2][v], lang: "es" })) return; }
      if (free && code === "ko" && grp && grp[0] === "Seoul Korean" && typeof window.__s1aOpen === "function") { window.__s1aOpen(); return; }
      if (free) { ui.libVol = { code, g, v }; openModal(libFreeModal); return; }
      toast("📚 Bài này thuộc Premium và đã mở cho bạn — nội dung đang được cập nhật.");
    }
  });
  window.WINDTP = {
    premium: isPremium, premiumDays: premiumDaysLeft, premiumLabel, chips: () => Number(state.chips || 0), premiumPrice: PREMIUM_PRICE, buyPremium,
    balance: () => state.balance, friends: () => FRIENDS.map((f) => ({ ...f, online: friendOnline(f), since: friendSince(f), rank: CULTIVATION_RANKS[f.realm].name, gender: (FRIEND_META[f.id] || [])[0] || "", age: (FRIEND_META[f.id] || [])[1] || null, record: socialState().record[f.id] || null })),
    friend: (id) => { const f = friendById(id); return f ? { ...f, online: friendOnline(f) } : null; },
    me: () => ({ name: state.userName }), poke: pokeFriend, pokeFx, ch: CH, toast,
    addFriend: addGameFriend, idOf: gameFriendId, hasFriend: (name) => !!friendByName(name),
    player: playerInfo, friendStatus, requestFriend
  };
  (function () { const f0 = window.WINDTP.friends; window.WINDTP.friends = function () { restoreGameFriends(); return f0(); }; })();
