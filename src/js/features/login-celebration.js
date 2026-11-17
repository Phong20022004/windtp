  /* ===== WINDTP Login Celebration: màn hiệu ứng ngày lễ sau đăng nhập, pháo hoa Giao thừa 60 giây, trang trí giao diện =====
     Máy chủ (worker/src/celebration.js) quyết định hôm nay có sự kiện nào và chống nhận quà trùng theo tài khoản.
     Trình duyệt chỉ gửi ngày địa phương, phát hiệu ứng, rồi gọi "claim"; Xu do máy chủ cộng. Mở thử: thêm ?celebrate=tet vào địa chỉ (không nhận quà). */
  var CELEB_SCENES = {
    newyear: { bg: "linear-gradient(#020617,#1e1b4b)", title: "HAPPY NEW YEAR!", sub: "Chúc mừng năm mới", hero: "🎆", fall: ["✨", "🎊"], show: "multi", glitter: true, titleLate: true, endSub: "Chúc mừng năm mới – Happy New Year!", gift: "💌", giftText: "Mở thiệp chúc mừng năm mới", msg: "Chúc bạn một năm mới học thật giỏi, vui thật nhiều!" },
    valentine: { bg: "linear-gradient(#be123c,#fb7185)", title: "Happy Valentine's Day!", sub: "Chạm vào trái tim nhé", hero: "💖", fall: ["💗", "💕", "🌹"], gift: "💖", giftText: "Chạm trái tim", burst: "💗", msg: "Bạn nhận được một trái tim ảo và thiệp Valentine 💌" },
    women: { bg: "linear-gradient(#831843,#f472b6)", title: "Happy Women's Day!", sub: "Bông hồng đang nở…", hero: "🌹", fall: ["🌸", "🌹"], gift: "🌹", giftText: "Nhận bông hồng", msg: "Bạn nhận được một bông hồng ảo 🌹", friends: "🌹" },
    white: { bg: "linear-gradient(#fdf2f8,#e0f2fe)", dark: false, title: "Happy White Day!", sub: "Hộp quà đang mở ra", hero: "🤍", fall: ["🤍", "🕊️", "🤍"], rise: true, reveal: "🍫", gift: "🎁", giftText: "Mở hộp quà", msg: "Bạn nhận được một hộp chocolate ảo 🍫" },
    fools: { bg: "linear-gradient(#0f766e,#14b8a6)", title: "Happy April Fools' Day!", sub: "", hero: "🎁", fall: ["🃏", "🎈"], prank: true },
    halloween: { bg: "linear-gradient(#0b0014,#4c1d95)", title: "Trick or Treat!", sub: "Có gì đó đang nhìn bạn…", hero: "🎃", fall: ["🦇", "👻"], fog: true, gift: "🎃", giftText: "Chạm vào quả bí ngô", msg: "Bạn nhận được sticker bí ngô Halloween 🎃" },
    men: { bg: "linear-gradient(#0c4a6e,#38bdf8)", title: "Happy International Men's Day!", sub: "", hero: "🎁", fall: ["💙", "⭐"], glow: true, reveal: "🏅", gift: "🎁", giftText: "Mở hộp quà xanh", msg: "Bạn nhận được huy hiệu Quốc tế Nam giới 🏅" },
    xmas: { bg: "linear-gradient(#052e16,#14532d)", title: "Merry Christmas!", sub: "Chạm hộp quà để mở", hero: "🎄", fall: ["❄️", "⛄", "❄️", "☃️", "❄️", "⭐"], gift: "🎁", giftText: "Mở hộp quà", msg: "Bạn nhận được thiệp Giáng sinh và sticker ông già Noel 🎅" },
    tet: { bg: "linear-gradient(#991b1b,#dc2626 55%,#f59e0b)", title: "Chúc Mừng Năm Mới!", sub: "Chạm vào phong bao lì xì", hero: "🏮", fall: ["🌸", "🌼", "✨", "🧧"], show: "gold", glitter: true, lanterns: true, titleLate: true, endSub: "Chúc mừng năm mới – Happy New Year!", gift: "🧧", giftText: "Mở lì xì", msg: "Vạn sự như ý, an khang thịnh vượng! 🌼 Bạn nhận được thiệp Tết, khung avatar Tết và huy hiệu chúc mừng năm mới." },
    midautumn: { bg: "linear-gradient(#1e1b4b,#312e81)", title: "Happy Mid-Autumn Festival!", sub: "Trăng rằm tháng Tám", hero: "🌕", fall: ["🏮", "✨"], rise: true, gift: "🥮", giftText: "Mở hộp bánh trung thu", msg: "Bạn nhận được sticker thỏ ngọc 🐇 và thiệp Trung thu" },
    qixi: { bg: "linear-gradient(#0f172a,#4c1d95)", title: "Happy Qixi Festival!", sub: "Ngưu Lang – Chức Nữ gặp nhau", hero: "🌌", fall: ["⭐", "✨"], photo: "qixi", intro: 10000, gift: "💌", giftText: "Mở thiệp tình yêu", msg: "Bạn nhận được một tấm thiệp tình yêu 💞" },
    wedding: { bg: "linear-gradient(#4c0519,#9f1239)", title: "THE WEDDING OF THE CENTURY!", sub: "", hero: "💍", fall: ["🌹", "🌸", "💮"], show: "gold", photo: "wedding", clear: true, titleLate: true, endSub: "Chúc mừng Đám cưới thế kỷ 💒", gift: "🎁", giftText: "Mở hộp quà cưới", msg: "Bạn nhận được thiệp cưới, sticker cặp đôi, khung avatar và huy hiệu kỷ niệm 💒" }
  };
  var CELEB_DECO = { newyear: "🎆", valentine: "💖", women: "🌹", white: "🤍", fools: "🃏", halloween: "🎃", men: "💙", xmas: "🎄", tet: "🏮", midautumn: "🌕", qixi: "🌌", wedding: "💍" };
  /** Lì xì Tết và quà Đám cưới (hoặc sự kiện có Xu): chỉ nhận khi mở hộp quà sau màn pháo hoa, và còn nhận được đến hết thời gian lễ. */
  function celebHeld(ev) { return ev.id === "tet" || ev.id === "wedding" || !!(ev.xu || ev.chips); }
  function celebShownStore() { try { return JSON.parse(localStorage.getItem("wd_cel_shown") || "[]"); } catch (e) { return []; } }
  function celebMarkShown(k) { var a = celebShownStore(); if (a.indexOf(k) < 0) a.push(k); try { localStorage.setItem("wd_cel_shown", JSON.stringify(a.slice(-60))); } catch (e) {} }
  var celeb = { queue: [], busy: false, seen: {}, timer: 0, tomorrow: null, tomorrowAt: "", raf: 0 };
  function celebCountry() { var m = { VND: "VN", KRW: "KR", JPY: "JP", TWD: "TW" }; return m[state.settings && state.settings.currency] || ""; }
  function celebOff() { try { return localStorage.getItem("wd_cel_off") === "1"; } catch (e) { return false; } }
  function celebDate(add) {
    var d = new Date(); d.setDate(d.getDate() + (add || 0));
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function celebSeenStore() { try { return JSON.parse(localStorage.getItem("wd_cel_seen") || "[]"); } catch (e) { return []; } }
  function celebMarkSeen(k) { var a = celebSeenStore(); if (a.indexOf(k) < 0) a.push(k); try { localStorage.setItem("wd_cel_seen", JSON.stringify(a.slice(-60))); } catch (e) {} }
  function celebGifts() { try { return JSON.parse(localStorage.getItem("wd_cel_gifts") || "[]"); } catch (e) { return []; } }

  // ----- Trang trí giao diện cả ngày lễ -----
  function celebDecorate(ev) {
    var root = document.documentElement, old = document.getElementById("cel-deco");
    if (old) old.remove();
    var up = !ev && celeb.upcoming;
    if (up) {
      root.removeAttribute("data-cel");
      var u = document.createElement("div"); u.id = "cel-deco"; u.setAttribute("aria-hidden", "true");
      u.innerHTML = '<div class="cel-badge">' + (CELEB_DECO[up.id] || "🎉") + " Còn " + up.days + " ngày nữa đến " + esc(up.name) + "</div>"; document.body.appendChild(u); return;
    }
    if (!ev) { root.removeAttribute("data-cel"); return; }
    root.setAttribute("data-cel", ev.theme);
    var sc = CELEB_SCENES[ev.id] || {}, em = sc.fall || [CELEB_DECO[ev.id]], d = document.createElement("div");
    d.id = "cel-deco"; d.setAttribute("aria-hidden", "true");
    var n = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 14, h = '<div class="cel-strip"></div>' + (celebHeld(ev) && !ev.claimed && !ev.forcedPreview ? '<button class="cel-badge cel-pending" data-action="cel-gift" data-id="' + ev.id + '">' + (CELEB_DECO[ev.id] || "🎁") + " Nhận quà " + esc(ev.name) + "</button>" : '<div class="cel-badge">' + (CELEB_DECO[ev.id] || "🎉") + " " + esc(ev.name) + "</div>");
    for (var i = 0; i < n; i++) h += '<i style="left:' + Math.round(Math.random() * 96) + "%;animation-delay:" + (-Math.random() * 14).toFixed(1) + "s;animation-duration:" + (9 + Math.random() * 9).toFixed(1) + "s;font-size:" + (14 + Math.round(Math.random() * 14)) + 'px">' + em[i % em.length] + "</i>";
    d.innerHTML = h; document.body.appendChild(d);
  }

  function celebThemeEmoji() { var t = celeb.top; return t && CELEB_SCENES[t.id] ? CELEB_SCENES[t.id].fall : null; }
  // Chạm vào đâu trên giao diện ngày lễ cũng bắn vài biểu tượng đúng chủ đề.
  document.addEventListener("click", function (e) {
    var list = celebThemeEmoji(); if (!list || !document.documentElement.getAttribute("data-cel") || e.target.closest("#cel-host") || celebOff()) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var box = document.createElement("div"); box.className = "cel-tap"; box.style.left = e.clientX + "px"; box.style.top = e.clientY + "px"; var h = "";
    for (var i = 0; i < 6; i++) h += '<i style="--dx:' + Math.round(Math.random() * 90 - 45) + "px;--dy:" + Math.round(-Math.random() * 70 - 20) + 'px">' + list[i % list.length] + "</i>";
    box.innerHTML = h; document.body.appendChild(box); window.setTimeout(function () { box.remove(); }, 900);
  }, true);

  // ----- Pháo hoa -----
  function celebBoom(v) {
    try {
      if (localStorage.getItem("wd_cel_mute") === "1") return;
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      var c = celeb.ac || (celeb.ac = new A()), len = c.sampleRate * 0.5, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      f.type = "lowpass"; f.frequency.value = 500; g.gain.value = Math.min(0.5, v || 0.25); s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
    } catch (e) {}
  }
  function celebChime(v) {
    try {
      if (localStorage.getItem("wd_cel_mute") === "1") return;
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return;
      var c = celeb.ac || (celeb.ac = new A()), t = c.currentTime;
      [659.25, 783.99, 987.77, 1318.5].forEach(function (f, i) {
        var o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.11); g.gain.exponentialRampToValueAtTime(v || 0.16, t + i * 0.11 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.11 + 0.5);
        o.connect(g); g.connect(c.destination); o.start(t + i * 0.11); o.stop(t + i * 0.11 + 0.55);
      });
    } catch (e) {}
  }
  /** Âm thanh từng sự kiện do admin chọn: auto (pháo hoa = tiếng nổ, còn lại = chuông), boom, chime hoặc none. */
  function celebSound(ev, kind) {
    var s = ev.sound || "auto"; if (s === "none") return;
    if (s === "auto") s = CELEB_SCENES[ev.id] && CELEB_SCENES[ev.id].show ? "boom" : "chime";
    if (kind === "gift") { celebChime(0.18); return; }
    s === "boom" ? celebBoom(0.3) : celebChime(0.14);
  }
  function celebFireworks(cv, opts) {
    var ctx = cv.getContext("2d"), W = 0, H = 0, P = [], R = [], t0 = performance.now(), last = t0, nextL = 0, dur = (opts.duration || 60), gold = opts.gold, running = true;
    var COLORS = gold ? [45, 38, 50, 33] : [0, 30, 50, 120, 190, 220, 280, 320];
    function fit() { var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    fit(); window.addEventListener("resize", fit);
    function burst(x, y, big, hue) {
      var n = big ? 170 : 70, sp = big ? 7 : 4.5, h = hue != null ? hue : COLORS[Math.floor(Math.random() * COLORS.length)];
      for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = (0.35 + Math.random() * 0.65) * sp; P.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, dec: 0.008 + Math.random() * 0.012, h: h + Math.random() * 16 - 8, g: gold ? 1 : 0 }); }
      if (!opts.silent) celebBoom(big ? 0.4 : 0.18);
    }
    function launch(big, slow) {
      R.push({ x: W * (big ? 0.5 : 0.12 + Math.random() * 0.76), y: H, ty: H * (big ? 0.28 : 0.12 + Math.random() * 0.4), vy: -(H / (slow ? 520 : 70)) * (big ? 1 : 1), big: big, hue: gold ? 45 : null });
    }
    function step(now) {
      if (!running) return;
      var e = (now - t0) / 1000, dt = Math.min(2, (now - last) / 16.7); last = now;
      if (opts.clear) { ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }
      else { ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "rgba(2,6,23,0.22)"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "lighter"; }
      // Kịch bản theo thang 60 giây (co giãn nếu thời lượng khác)
      var k = e * 60 / dur;
      if (k < 10) { if (!nextL) { nextL = 1; launch(true, true); } }
      else if (k >= 20 && k < 45) { if (e > nextL) { nextL = e + 0.45 + Math.random() * 0.5; launch(false); } }
      else if (k >= 45 && k < 55) { if (e > nextL) { nextL = e + 0.1; launch(Math.random() < 0.15); } }
      else if (k >= 55) { if (e > nextL) { nextL = e + 0.16; var x = W * Math.random(), y = H * (0.15 + Math.random() * 0.4); burst(x, y, true, 45); } }
      if (k >= 10 && !celeb._first) { celeb._first = true; }
      for (var i = R.length - 1; i >= 0; i--) {
        var r = R[i]; r.y += r.vy * dt; ctx.fillStyle = "hsla(" + (r.hue || 40) + ",100%,75%,.9)"; ctx.beginPath(); ctx.arc(r.x, r.y, r.big ? 3.5 : 2, 0, 6.283); ctx.fill();
        if (r.y <= r.ty) { burst(r.x, r.y, r.big || Math.random() < 0.2, r.hue); R.splice(i, 1); }
      }
      for (var j = P.length - 1; j >= 0; j--) {
        var p = P[j]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.045 * dt; p.vx *= 0.99; p.life -= p.dec * dt;
        if (p.life <= 0) { P.splice(j, 1); continue; }
        ctx.fillStyle = "hsla(" + p.h + ",100%," + (p.g ? 62 : 58) + "%," + p.life + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 + p.life * 1.4, 0, 6.283); ctx.fill();
      }
      if (opts.onTick) opts.onTick(e, k);
      if (e >= dur) { running = false; window.removeEventListener("resize", fit); opts.onEnd && opts.onEnd(); return; }
      celeb.raf = requestAnimationFrame(step);
    }
    celeb._first = false; celeb.raf = requestAnimationFrame(step);
    return { stop: function () { running = false; cancelAnimationFrame(celeb.raf); window.removeEventListener("resize", fit); } };
  }

  // ----- Màn hình sự kiện -----
  function celebFall(host, list, rise) {
    var h = "";
    for (var i = 0; i < 22; i++) h += '<i' + (rise ? ' class="rise"' : "") + ' style="left:' + Math.round(Math.random() * 98) + "%;animation-delay:" + (-Math.random() * 10).toFixed(1) + "s;animation-duration:" + (6 + Math.random() * 7).toFixed(1) + "s;font-size:" + (16 + Math.round(Math.random() * 22)) + 'px">' + list[i % list.length] + "</i>";
    return h;
  }
  function celebGlitter() {
    var h = "";
    for (var i = 0; i < 40; i++) h += '<b style="left:' + Math.round(Math.random() * 99) + "%;animation-delay:" + (-Math.random() * 6).toFixed(1) + "s;animation-duration:" + (3 + Math.random() * 4).toFixed(1) + 's"></b>';
    return h;
  }
  var CELEB_MAGPIE = '<svg viewBox="0 0 60 30" aria-hidden="true"><path class="w1" d="M30 15C20 1 8 1 0 6c10 2 18 6 30 9z" fill="#0f172a"/><path class="w2" d="M30 15C40 1 52 1 60 6c-10 2-18 6-30 9z" fill="#1e293b"/><path d="M22 16 8 21l15-2z" fill="#0f172a"/><ellipse cx="30" cy="16.5" rx="9" ry="4" fill="#111827"/><ellipse cx="30" cy="17.8" rx="4" ry="1.5" fill="#e2e8f0"/><path d="M38 15l8-1-7 3z" fill="#111827"/></svg>';
  /** Cảnh dùng ảnh nền: Thất Tịch = đàn chim thước bay quanh cầu, Đám cưới = nhẫn lấp lánh. */
  function celebPhoto(id) {
    var h = '<div class="cel-photo-blur" style="background-image:url(\'' + CELEB_IMG[id] + '\')"></div><div class="cel-photo" style="background-image:url(\'' + CELEB_IMG[id] + '\')"></div><div class="cel-photo-shade"></div>', i;
    if (id === "qixi") {
      h += '<div class="cel-moonglow"></div><div class="cel-birds">';
      for (i = 0; i < 16; i++) h += '<span style="top:' + Math.round(6 + Math.random() * 48) + "%;width:" + (34 + Math.round(Math.random() * 34)) + "px;animation-duration:" + (9 + Math.random() * 9).toFixed(1) + "s;animation-delay:" + (-Math.random() * 14).toFixed(1) + 's">' + CELEB_MAGPIE + "</span>";
      h += "</div>";
    } else {
      h += '<div class="cel-twinkle">';
      for (i = 0; i < 26; i++) h += '<i style="left:' + Math.round(8 + Math.random() * 84) + "%;top:" + Math.round(8 + Math.random() * 80) + "%;animation-delay:" + (-Math.random() * 3).toFixed(1) + "s;font-size:" + (10 + Math.round(Math.random() * 14)) + 'px">✦</i>';
      h += '<i class="big" style="left:47%;top:24%">✦</i></div>';
    }
    return h;
  }
  function celebHeroFx(id, hero) {
    if (id === "wedding" || id === "qixi") return ""; // hai cảnh này dùng ảnh nền (celebPhoto)
    if (id === "valentine") return '<div class="cel-rose">🌹</div>';
    if (id === "white") return '<div class="cel-boxwrap"><span class="cel-boxtop">🍫</span><span class="cel-hero">🎁</span></div>';
    if (id === "midautumn") return '<div class="cel-moon">🌕<span>🐇</span></div>';
    if (id === "women") return '<div class="cel-rose">🌹</div>';
    if (id === "halloween") return '<div class="cel-pumpkin"><i class="e l"></i><i class="e r"></i><i class="m"></i></div>';
    if (id === "xmas") return '<div class="cel-hero cel-glow">🎄</div>';
    return '<div class="cel-hero">' + hero + "</div>";
  }
  function celebRun(ev, opt) {
    opt = opt || {};
    var sc = CELEB_SCENES[ev.id]; if (!sc) return Promise.resolve();
    return new Promise(function (done) {
      var host = document.createElement("div"), fw = null, finished = false, claimed = false, stage = 0;
      host.id = "cel-host"; host.className = "cel-" + ev.id + (sc.dark === false ? " cel-light" : ""); host.style.background = sc.bg;
      host.setAttribute("role", "dialog"); host.setAttribute("aria-modal", "true"); host.setAttribute("aria-label", ev.name);
      document.body.appendChild(host); document.body.style.overflow = "hidden";
      var prank = !!sc.prank;
      function close() {
        if (finished) return; finished = true;
        if (fw) fw.stop(); host.remove(); document.body.style.overflow = "";
        if (opt.preview) { done(); return; }
        if (!celebHeld(ev) || claimed) celebMarkSeen(ev.id + ":" + ev.period);
        if (!claimed && !prank && !celebHeld(ev) && window.WindtpApi) { claimed = true; claimNow(true); }
        else if (prank && window.WindtpApi) { try { econClient().claimCelebration(ev.id, celebDate(), celebCountry()).catch(function () {}); } catch (e) {} }
        done();
      }
      function claimNow(quiet) {
        return econClient().claimCelebration(ev.id, celebDate(), celebCountry()).then(function (r) {
          var g = celebGifts(); g.push({ id: ev.id, period: ev.period, gift: ev.gift, ts: Date.now() }); try { localStorage.setItem("wd_cel_gifts", JSON.stringify(g.slice(-40))); } catch (e) {}
          celebSyncGifts(); ev.claimed = true; celebMarkSeen(ev.id + ":" + ev.period); if (celeb.top && celeb.top.id === ev.id) celebDecorate(celeb.top);
          if (r && (r.xu || r.chips) && typeof econRefresh === "function") econRefresh(true);
          return r;
        }, function (e) { if (!quiet && typeof econFail === "function") econFail(e, true); return null; });
      }
      function chrome() {
        return '<button class="cel-skip" data-cel="skip">Bỏ qua ✕</button><button class="cel-mute" data-cel="mute" aria-label="Âm thanh">' + (localStorage.getItem("wd_cel_mute") === "1" ? "🔇" : "🔊") + "</button>";
      }
      function stage1() {
        stage = 1;
        var show = sc.show;
        host.classList.toggle("cel-photoscene", !!sc.photo);
        host.innerHTML = (sc.photo ? celebPhoto(sc.photo) : "") + '<div class="cel-fall">' + celebFall(host, sc.fall, sc.rise) + "</div>" + (sc.glitter ? '<div class="cel-fall cel-glitter">' + celebGlitter() + "</div>" : "") + (sc.lanterns ? '<div class="cel-lant l1">🏮</div><div class="cel-lant l2">🏮</div><div class="cel-lant l3">🏮</div>' : "") + (ev.id === "qixi" ? '<div class="cel-milky"></div>' : "") + (show ? '<canvas class="cel-cv"></canvas>' : "") + (sc.fog ? '<div class="cel-fog"></div>' : "") +
          '<div class="cel-main">' + (show === "multi" ? "" : celebHeroFx(ev.id, sc.hero)) + '<h1 class="cel-title" style="opacity:' + (sc.titleLate ? 0 : 1) + '">' + esc(sc.title) + '</h1><p class="cel-sub">' + esc(sc.sub || "") + "</p></div>" + chrome();
        var title = host.querySelector(".cel-title"), sub = host.querySelector(".cel-sub");
        if (!show && !opt.giftOnly) celebSound(ev, "intro");
        if (opt.giftOnly) { stage2(); return; }
        if (show) {
          var cv = host.querySelector(".cel-cv"), shown = false, countdown = opt.countdown;
          fw = celebFireworks(cv, { clear: !!sc.clear, silent: ev.sound === "none" || ev.sound === "chime", gold: show === "gold", duration: ev.duration || 60, onTick: function (e, k) { if (k >= 55 && !shown) { shown = true; title.style.opacity = 1; title.classList.add("cel-pop"); sub.textContent = sc.endSub || ""; } }, onEnd: stage2 });
        } else { setTimeout(function () { if (!finished && stage === 1) stage2(); }, sc.intro || (ev.id === "women" ? 7000 : 6000)); }
      }
      function stage2() {
        if (finished || stage === 2) return; stage = 2; celebMarkShown(ev.id + ":" + ev.period); if (fw) { fw.stop(); fw = null; }
        if (prank) return stagePrank();
        var cv = host.querySelector(".cel-cv"); if (cv) cv.style.opacity = 0.35;
        var main = host.querySelector(".cel-main");
        main.innerHTML = (ev.id === "xmas" ? '<div class="cel-hero cel-glow cel-tree">🎄</div>' : "") + '<h1 class="cel-title cel-pop">' + esc(sc.title) + '</h1><button class="cel-gift" data-cel="open" aria-label="' + esc(sc.giftText) + '">' + sc.gift + '</button><p class="cel-sub">' + esc(sc.giftText) + "</p>";
      }
      function stagePrank() {
        var main = host.querySelector(".cel-main");
        main.innerHTML = '<div class="cel-prank"><div class="cel-hero">🪙</div><h2 class="cel-title">Bạn vừa nhận được 10.000 Wind Coin!</h2><button class="cel-btn" data-cel="prank">Nhận ngay</button></div>';
      }
      function open() {
        if (stage !== 2 || finished) return; stage = 3;
        var main = host.querySelector(".cel-main"), burst = sc.burst, friends = sc.friends;
        if (sc.glow) host.insertAdjacentHTML("afterbegin", '<div class="cel-blueglow"></div>');
        main.innerHTML = '<div class="cel-hero cel-pop">' + (sc.reveal || sc.gift) + '</div><h1 class="cel-title">' + esc(sc.title) + '</h1><p class="cel-msg">' + esc(sc.msg) + '</p><p class="cel-reward" data-reward></p>' +
          (friends ? '<button class="cel-btn alt" data-cel="friend">🌹 Gửi hoa cho bạn bè</button>' : "") + '<button class="cel-btn" data-cel="done">Vào WINDTP</button>';
        celebSound(ev, "gift"); celebConfetti(host, sc.fall);
        claimed = true;
        if (!opt.preview && window.WindtpApi) claimNow().then(function (r) { var el = host.querySelector("[data-reward]"); if (el && r && (r.xu || r.chips)) el.textContent = "🎁 +" + (r.xu ? r.xu + " Xu " : "") + (r.chips ? r.chips + " chip" : ""); });
      }
      host.addEventListener("click", function (e) {
        var b = e.target.closest("[data-cel]"), a = b && b.dataset.cel;
        if (!a) { if (stage === 2 && sc.burst) celebConfetti(host, [sc.burst]); return; }
        if (a === "skip") { if (stage === 1) stage2(); else close(); }
        else if (a === "mute") { var m = localStorage.getItem("wd_cel_mute") === "1"; try { localStorage.setItem("wd_cel_mute", m ? "0" : "1"); } catch (er) {} b.textContent = m ? "🔊" : "🔇"; }
        else if (a === "open") { if (sc.burst) celebConfetti(host, [sc.burst, sc.burst, "💔"]); b.classList.add("cel-shake"); setTimeout(open, sc.burst ? 600 : 450); }
        else if (a === "done") close();
        else if (a === "prank") {
          var main = host.querySelector(".cel-main"); host.classList.add("cel-shake");
          setTimeout(function () { host.classList.remove("cel-shake"); main.innerHTML = '<div class="cel-hero cel-fish">🐟</div><h1 class="cel-title cel-pop">Cá tháng Tư!<br>Bắt được bạn rồi!</h1><p class="cel-msg">Chỉ là trò đùa thôi nhé, Wind Coin của bạn không đổi 😄</p><button class="cel-btn" data-cel="done">Vào WINDTP</button>'; stage = 3; }, 700);
        } else if (a === "friend") {
          var fr = []; try { fr = window.WINDTP && window.WINDTP.friends ? window.WINDTP.friends() : []; } catch (er) { }
          if (!fr.length) { toast("Hãy kết bạn để gửi hoa nhé"); return; }
          var old = host.querySelector(".cel-friends"); if (old) { old.remove(); return; }
          var box = document.createElement("div"); box.className = "cel-friends";
          box.innerHTML = fr.slice(0, 12).map(function (f) { return '<button data-cel="rose" data-fid="' + esc(f.id) + '" data-fname="' + esc(f.name) + '">🌹 ' + esc(f.name) + "</button>"; }).join("");
          host.querySelector(".cel-main").appendChild(box);
        } else if (a === "rose") {
          try { if (window.WINDTP.poke) window.WINDTP.poke(b.dataset.fid); } catch (er) { }
          b.disabled = true; b.textContent = "✓ Đã gửi cho " + b.dataset.fname; celebConfetti(host, ["🌹", "🌸"]);
        }
      });
      host.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
      if (opt.countdown) {
        var n = 10; host.innerHTML = '<div class="cel-count"><p>Giao thừa sắp đến…</p><b data-n>10</b></div>' + chrome();
        var iv = setInterval(function () { n--; if (finished) { clearInterval(iv); return; } if (n <= 0) { clearInterval(iv); stage1(); } else host.querySelector("[data-n]").textContent = n; }, 1000);
      } else stage1();
    });
  }
  function celebConfetti(host, list) {
    var box = document.createElement("div"); box.className = "cel-burst"; var h = "";
    for (var i = 0; i < 28; i++) h += '<i style="--dx:' + Math.round(Math.random() * 360 - 180) + "px;--dy:" + Math.round(-Math.random() * 300 - 40) + 'px;font-size:' + (16 + Math.round(Math.random() * 18)) + 'px">' + list[i % list.length] + "</i>";
    box.innerHTML = h; host.appendChild(box); setTimeout(function () { box.remove(); }, 1600);
  }

  // ----- Luồng sau đăng nhập -----
  function celebPump() {
    if (celeb.busy) return;
    var ev = celeb.queue.shift(); if (!ev) return;
    celeb.busy = true;
    celebRun(ev, ev.__opt || {}).then(function () { celeb.busy = false; celebPump(); }, function () { celeb.busy = false; celebPump(); });
  }
  function celebCheck(force) {
    if (!state.account || !window.WindtpApi || celebOff()) return Promise.resolve();
    return econClient().celebration(celebDate(), celebCountry()).then(function (day) {
      var list = day.events; celeb.upcoming = day.upcoming;
      celeb.list = list; celeb.top = list[0] || null; celebDecorate(celeb.top);
      var seen = celebSeenStore(), shown = celebShownStore();
      list.forEach(function (ev) {
        var k = ev.id + ":" + ev.period;
        if (ev.claimed || celeb.seen[k]) return;
        if (!celebHeld(ev) && seen.indexOf(k) >= 0) return;
        if (celebHeld(ev) && shown.indexOf(k) >= 0) ev.__opt = { giftOnly: true }; // đã xem pháo hoa rồi: vào thẳng hộp quà
        celeb.seen[k] = 1; celeb.queue.push(ev);
      });
      celebPump();
    }, function () { });
  }
  /** Khoảng 23:59:50 đến 00:00: nếu ngày mai là khoảnh khắc Giao thừa/Năm mới thì đếm ngược rồi bắn pháo hoa. */
  function celebTick() {
    var d = new Date(), s = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    if (!state.account || !window.WindtpApi || celebOff()) return;
    if (s >= 86400 - 120 && celeb.tomorrowAt !== celebDate(1)) {
      celeb.tomorrowAt = celebDate(1); celeb.tomorrow = null;
      econClient().celebration(celeb.tomorrowAt, celebCountry()).then(function (day) { celeb.tomorrow = day.events.filter(function (e) { return e.midnight && !e.claimed; })[0] || null; }, function () { });
    }
    if (s >= 86400 - 10 && celeb.tomorrow && !celeb.busy) {
      var ev = celeb.tomorrow; celeb.tomorrow = null; var k = ev.id + ":" + ev.period; celeb.seen[k] = 1;
      ev.__opt = { countdown: true }; celeb.queue.unshift(ev); celebPump();
    }
    if (s >= 5 && s < 12 && celeb.lastDay !== celebDate()) { celeb.lastDay = celebDate(); celebCheck(); } // sang ngày mới: cập nhật trang trí và sự kiện
  }
  function celebStop() { window.clearInterval(celeb.timer); window.clearInterval(celeb.poll); celeb.queue = []; celeb.tomorrow = null; celebDecorate(null); }
  function celebBoot() {
    celeb.lastDay = celebDate();
    var q = (new URLSearchParams(location.search)).get("celebrate");
    if (q && CELEB_SCENES[q]) { celebRun({ id: q, name: q, period: "preview", gift: "", theme: q }, { preview: true }); return; }
    celebCheck(); celebSyncGifts();
    window.clearInterval(celeb.timer); celeb.timer = window.setInterval(celebTick, 1000);
    window.clearInterval(celeb.poll); celeb.poll = window.setInterval(function () { if (document.visibilityState === "visible") celebCheck(); }, 180000);
  }

  // ----- Admin: bật/tắt, quà, ngày Đám cưới thế kỷ, bật thử -----
  var CELEB_NAMES = { newyear: "Tết Dương lịch 01/01", valentine: "Valentine 14/02", women: "Quốc tế Phụ nữ 08/03", white: "Valentine Trắng 14/03", fools: "Cá tháng Tư 01/04", halloween: "Halloween 31/10", men: "Quốc tế Nam giới 19/11", xmas: "Giáng sinh 24–25/12", tet: "Tết Nguyên đán (30 Chạp – mùng 6)", midautumn: "Trung thu 14–15/8 âm", qixi: "Thất Tịch 7/7 âm", wedding: "Đám cưới thế kỷ (3 ngày)" };
  var celAdm = null;
  function celebAdminCard() {
    return '<div class="glass-card rounded-2xl p-4 border border-amber-200 bg-amber-50/70"><div class="flex items-center justify-between gap-3"><div><h3 class="text-sm font-extrabold text-slate-800">🎉 Sự kiện lễ (hiệu ứng đăng nhập)</h3><p class="text-[11px] text-slate-600 mt-1">Bật/tắt, quà Xu, ngày Đám cưới thế kỷ, bật thử cho mọi người.</p></div><button data-action="cel-admin-open" class="px-3 py-2 rounded-xl bg-amber-500 text-white keep-white text-xs font-bold">Mở</button></div></div>';
  }
  function celebAdminModal() {
    var c = celAdm && celAdm.cfg; if (!c) return modalHead("🎉 Sự kiện lễ") + '<div class="p-5 text-sm">Đang tải…</div>';
    var rows = Object.keys(CELEB_NAMES).map(function (id) {
      var e = c.events[id] || { enabled: true, xu: 0, chips: 0 }, forced = c.force && c.force.id === id;
      return '<div class="border border-slate-200 rounded-xl p-2.5 space-y-1.5" data-cel-row="' + id + '"><label class="flex items-center gap-2 text-xs font-bold text-slate-800"><input type="checkbox" data-f="enabled"' + (e.enabled !== false ? " checked" : "") + '> ' + esc(CELEB_NAMES[id]) + (forced ? ' <span class="text-[10px] bg-rose-600 text-white keep-white rounded-full px-1.5">ĐANG BẬT THỬ</span>' : "") + '</label>' +
        (id === "fools" ? '<p class="text-[10px] text-slate-500">Chỉ là trò đùa — không bao giờ cộng Xu.</p>' : '<div class="flex gap-2 text-[11px]"><label>Xu <input data-f="xu" type="number" min="0" value="' + (e.xu || 0) + '" class="w-20 border rounded px-1"></label><label>Chip <input data-f="chips" type="number" min="0" value="' + (e.chips || 0) + '" class="w-16 border rounded px-1"></label></div>') +
        '<div class="flex flex-wrap gap-2 text-[11px]"><label>Thời lượng (giây, 0 = mặc định) <input data-f="duration" type="number" min="0" max="120" value="' + (e.duration || 0) + '" class="w-14 border rounded px-1"></label><label>Âm thanh <select data-f="sound" class="border rounded px-1">' + [["auto", "Tự động"], ["boom", "Tiếng nổ"], ["chime", "Chuông"], ["none", "Tắt"]].map(function (o) { return '<option value="' + o[0] + '"' + ((e.sound || "auto") === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + '</select></label><label>Phát lại <select data-f="repeat" class="border rounded px-1"><option value="year"' + ((e.repeat || "year") === "year" ? " selected" : "") + '>1 lần/năm</option><option value="daily"' + (e.repeat === "daily" ? " selected" : "") + '>Mỗi ngày lễ</option></select></label><label>Quốc gia (VN,KR,JP,TW; trống = tất cả) <input data-f="countries" type="text" value="' + esc((e.countries || []).join(",")) + '" class="w-24 border rounded px-1"></label></div>' +
        (id === "wedding" ? "" : '<div class="flex flex-wrap gap-2 text-[11px] items-center"><span class="font-bold">Ngày diễn ra tùy chỉnh (trống = mặc định):</span><input data-f="from" type="date" value="' + esc((e.range && e.range.from) || "") + '" class="border rounded px-1"> → <input data-f="to" type="date" value="' + esc((e.range && e.range.to) || "") + '" class="border rounded px-1"></div>') +
        '<div class="flex gap-1.5"><button data-action="cel-preview" data-id="' + id + '" class="px-2 py-1 rounded-lg bg-slate-100 text-[11px] font-bold">👁 Xem thử</button><button data-action="cel-force" data-id="' + id + '" class="px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-[11px] font-bold">⚡ Bật cho mọi người</button></div></div>';
    }).join("");
    return modalHead("🎉 Sự kiện lễ") + '<div class="p-4 space-y-2.5 text-slate-800"><label class="flex items-center gap-2 text-xs font-extrabold"><input type="checkbox" id="cel-all"' + (c.enabled !== false ? " checked" : "") + '> Bật hệ thống sự kiện</label>' +
      '<div class="border border-slate-200 rounded-xl p-2.5 text-[11px] space-y-1"><b>💍 Ngày Đám cưới thế kỷ</b><div class="flex gap-2 items-center"><input type="date" id="cel-wd" value="' + esc(c.wedding.start || "") + '" class="border rounded px-1"><label>số ngày <input type="number" id="cel-wn" min="1" max="14" value="' + (c.wedding.days || 3) + '" class="w-12 border rounded px-1"></label></div><p class="text-slate-500">Để trống = chưa có ngày. Khi có ngày, hệ thống tự kích hoạt đúng các ngày đó.</p></div>' + rows +
      '<div class="flex gap-2"><button data-action="cel-admin-save" class="flex-1 py-2 rounded-xl bg-emerald-600 text-white keep-white text-xs font-bold">Lưu</button>' + (c.force ? '<button data-action="cel-force-off" class="flex-1 py-2 rounded-xl bg-slate-200 text-xs font-bold">Tắt chế độ bật thử</button>' : "") + "</div></div>";
  }
  function celebAdminRead() {
    var host = $("#modal-host"), c = celAdm.cfg;
    c.enabled = host.querySelector("#cel-all").checked;
    host.querySelectorAll("[data-cel-row]").forEach(function (r) {
      var f = function (k) { var el = r.querySelector('[data-f="' + k + '"]'); return el ? (el.type === "checkbox" ? el.checked : Math.max(0, parseInt(el.value, 10) || 0)) : 0; };
      var t = function (k, d) { var el = r.querySelector('[data-f="' + k + '"]'); return el ? el.value : d; };
      var dur = Math.min(120, f("duration")); if (dur > 0 && dur < 10) dur = 10;
      c.events[r.dataset.celRow] = { enabled: f("enabled"), xu: f("xu"), chips: f("chips"), duration: dur, sound: t("sound", "auto"), repeat: t("repeat", "year"),
        countries: String(t("countries", "")).split(/[,\s]+/).map(function (x) { return x.trim().toUpperCase(); }).filter(Boolean) };
      var fr = t("from", ""), to = t("to", ""); if (fr && to) { c.events[r.dataset.celRow].from = fr; c.events[r.dataset.celRow].to = to; }
    });
    c.wedding = { start: host.querySelector("#cel-wd").value || "", days: Math.min(14, Math.max(1, parseInt(host.querySelector("#cel-wn").value, 10) || 3)) };
  }
  function celebAdminSave() { return econClient().admin.setCelebration(celAdm.cfg).then(function () { toast("Đã lưu sự kiện lễ"); }, function (e) { econFail(e); throw e; }); }
  Object.assign(actions, {
    "cel-gift": function (el) {
      var ev = (celeb.list || []).filter(function (e) { return e.id === el.dataset.id && !e.claimed; })[0]; if (!ev) return;
      var k = ev.id + ":" + ev.period; ev.__opt = { giftOnly: celebShownStore().indexOf(k) >= 0 };
      celeb.queue.push(ev); celebPump();
    },
    "cel-admin-open": function () {
      celAdm = { cfg: null }; openModal(celebAdminModal);
      econClient().admin.celebrationConfig().then(function (c) { celAdm.cfg = c; refreshModal(); }, function (e) { econFail(e); });
    },
    "cel-admin-save": function () { celebAdminRead(); return celebAdminSave().then(refreshModal, function () { }); },
    "cel-preview": function (el) { var id = el.dataset.id; closeModal(); return celebRun({ id: id, name: CELEB_NAMES[id], period: "preview", gift: "", theme: id }, { preview: true, countdown: false }); },
    "cel-force": function (el) {
      celebAdminRead(); var prev = celAdm.cfg.force; celAdm.cfg.force = { id: el.dataset.id, nonce: ((prev && prev.nonce) || 0) + 1 };
      return celebAdminSave().then(function () { toast("Đã bật cho mọi người (mỗi tài khoản nhận một lần)"); refreshModal(); celebCheck(); }, function () { });
    },
    "cel-force-off": function () { celebAdminRead(); celAdm.cfg.force = null; return celebAdminSave().then(refreshModal, function () { }); }
  });

  // ----- Quà lễ: bộ sưu tập, khung avatar, huy hiệu, công tắc hiệu ứng -----
  var CELEB_GIFTS = {
    newyear: [["💌", "Thiệp chúc mừng năm mới", "card"]],
    valentine: [["💗", "Trái tim ảo", "sticker"], ["💌", "Thiệp Valentine", "card"], ["🖼️", "Khung avatar Valentine", "frame", "f-gift-valentine"]],
    women: [["🌹", "Bông hồng ảo", "sticker"]],
    white: [["🍫", "Hộp chocolate ảo", "sticker"]],
    halloween: [["🎃", "Sticker bí ngô", "sticker"], ["🖼️", "Khung avatar Halloween", "frame", "f-gift-halloween"]],
    men: [["🏅", "Huy hiệu Quốc tế Nam giới", "badge"]],
    xmas: [["💌", "Thiệp Giáng sinh", "card"], ["🎅", "Sticker ông già Noel", "sticker"], ["🖼️", "Khung avatar Giáng sinh", "frame", "f-gift-xmas"]],
    tet: [["🧧", "Thiệp Tết đặc biệt", "card"], ["🏅", "Huy hiệu chúc mừng năm mới", "badge"], ["🖼️", "Khung avatar Tết", "frame", "f-gift-tet"]],
    midautumn: [["🐇", "Sticker thỏ ngọc", "sticker"], ["🥮", "Thiệp Trung thu", "card"], ["🖼️", "Khung avatar Trung thu", "frame", "f-gift-midautumn"]],
    qixi: [["💞", "Thiệp tình yêu", "card"]],
    wedding: [["💒", "Thiệp cưới Đám cưới thế kỷ", "card"], ["👩‍❤️‍👨", "Sticker cặp đôi", "sticker"], ["🏅", "Huy hiệu kỷ niệm Đám cưới thế kỷ", "badge"], ["🖼️", "Khung avatar Đám cưới", "frame", "f-gift-wedding"]]
  };
  function celebBadgeKey() { try { return localStorage.getItem("wd_cel_badge") || ""; } catch (e) { return ""; } }
  function celebHasGift(id) { return (celeb.gifts || []).some(function (g) { return g.id === id; }); }
  function celebBadgeHtml() {
    var k = celebBadgeKey(); if (!k) return "";
    var id = k.split(":")[0], it = (CELEB_GIFTS[id] || []).filter(function (x) { return x[2] === "badge"; })[0];
    return it && celebHasGift(id) ? ' <span title="' + esc(it[1]) + '">' + it[0] + "</span>" : "";
  }
  function celebSyncGifts() {
    if (!state.account || !window.WindtpApi) return Promise.resolve();
    return econClient().celebrationGifts().then(function (list) {
      celeb.gifts = list; var changed = false;
      Object.keys(CELEB_GIFTS).forEach(function (id) {
        if (!celebHasGift(id)) return;
        CELEB_GIFTS[id].forEach(function (it) { if (it[2] === "frame" && (state.ownedFrames || []).indexOf(it[3]) < 0) { state.ownedFrames = (state.ownedFrames || []).concat([it[3]]); changed = true; } });
      });
      if (changed && typeof commit === "function") commit();
    }, function () { });
  }
  function celebSettingsCard() {
    var on = !celebOff(), mute = localStorage.getItem("wd_cel_mute") === "1";
    return '<div class="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2"><div class="font-extrabold text-amber-800">🎉 Hiệu ứng ngày lễ</div>' +
      '<label class="flex items-center justify-between gap-2 font-bold text-slate-700">Hiện hiệu ứng & trang trí khi đăng nhập ngày lễ<input type="checkbox" data-action="cel-toggle"' + (on ? " checked" : "") + '></label>' +
      '<label class="flex items-center justify-between gap-2 font-bold text-slate-700">Âm thanh hiệu ứng lễ<input type="checkbox" data-action="cel-mute-toggle"' + (mute ? "" : " checked") + '></label>' +
      '<button data-action="cel-collection" class="w-full py-2 rounded-xl bg-amber-500 text-white keep-white font-bold">🎁 Bộ sưu tập quà lễ của tôi</button></div>';
  }
  function celebCollectionModal() {
    var list = celeb.gifts, body;
    if (!list) body = '<p class="text-sm text-slate-600">Đang tải…</p>';
    else if (!list.length) body = '<p class="text-sm text-slate-600">Bạn chưa nhận quà lễ nào. Đăng nhập vào dịp lễ để nhận quà nhé! 🎉</p>';
    else {
      var seen = {}, wearing = celebBadgeKey();
      body = list.filter(function (g) { var k = g.id; if (seen[k]) return false; seen[k] = 1; return CELEB_GIFTS[g.id]; }).map(function (g) {
        var years = list.filter(function (x) { return x.id === g.id; }).length;
        return '<div class="border border-slate-200 rounded-2xl p-3 space-y-2"><p class="font-extrabold text-sm text-slate-800">' + esc((CELEB_NAMES[g.id] || g.id)) + (years > 1 ? ' <span class="text-[10px] text-slate-500">· nhận ' + years + " lần</span>" : "") + "</p>" +
          CELEB_GIFTS[g.id].map(function (it) {
            var act = "";
            if (it[2] === "badge") act = wearing === g.id + ":badge" ? '<span class="text-[10px] font-bold text-emerald-700">Đang đeo</span> <button data-action="cel-badge" data-k="" class="px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-bold">Bỏ đeo</button>' : '<button data-action="cel-badge" data-k="' + g.id + ':badge" class="px-2 py-1 rounded-lg bg-sky-600 text-white keep-white text-[10px] font-bold">Đeo huy hiệu</button>';
            else if (it[2] === "frame") act = state.frameId === it[3] ? '<span class="text-[10px] font-bold text-emerald-700">Đang dùng</span>' : '<button data-action="equip-cosmetic" data-kind="frame" data-id="' + it[3] + '" class="px-2 py-1 rounded-lg bg-sky-600 text-white keep-white text-[10px] font-bold">Dùng khung</button>';
            return '<div class="flex items-center gap-2 text-xs"><span class="text-2xl">' + it[0] + '</span><span class="flex-1 font-bold text-slate-700">' + esc(it[1]) + "</span>" + act + "</div>";
          }).join("") + "</div>";
      }).join("");
    }
    return modalHead("🎁 Quà lễ của tôi") + '<div class="p-4 space-y-3">' + body + "</div>";
  }
  Object.assign(actions, {
    "cel-toggle": function (el) {
      try { localStorage.setItem("wd_cel_off", el.checked ? "0" : "1"); } catch (e) { }
      if (el.checked) { celebBoot(); toast("Đã bật hiệu ứng ngày lễ"); } else { celebStop(); toast("Đã tắt hiệu ứng ngày lễ"); }
    },
    "cel-mute-toggle": function (el) { try { localStorage.setItem("wd_cel_mute", el.checked ? "0" : "1"); } catch (e) { } },
    "cel-collection": function () { celeb.gifts = celeb.gifts || null; openModal(celebCollectionModal); celebSyncGifts().then(function () { if (ui.renderModal === celebCollectionModal) refreshModal(); }); },
    "cel-badge": function (el) { try { localStorage.setItem("wd_cel_badge", el.dataset.k || ""); } catch (e) { } refreshModal(); }
  });

  // ----- Gửi thiệp / sticker quà lễ trong chat (tin nhắn dạng [[gift:<sự kiện>:<số thứ tự>]]) -----
  var CELEB_TOKEN = /^\[\[gift:([a-z]+):(\d)\]\]$/;
  function celebTokenItem(t) {
    var m = CELEB_TOKEN.exec(String(t || "").trim()), list = m && CELEB_GIFTS[m[1]], it = list && list[+m[2]];
    return it && (it[2] === "sticker" || it[2] === "card") ? { it: it, ev: m[1] } : null;
  }
  function celebChatHtml(t) {
    var g = celebTokenItem(t); if (!g) return esc(t);
    return g.it[2] === "sticker" ? '<span class="cel-sticker" title="' + esc(g.it[1]) + '">' + g.it[0] + "</span>"
      : '<span class="cel-card"><span class="cel-card-e">' + g.it[0] + '</span><b>' + esc(g.it[1]) + "</b><small>" + esc(CELEB_NAMES[g.ev] || "") + "</small></span>";
  }
  function celebChatPlain(t) { var g = celebTokenItem(t); return g ? g.it[0] + " " + esc(g.it[1]) : esc(String(t).slice(0, 60)); }
  function celebPickerBtn(kind) { return '<button type="button" data-action="cel-picker" data-kind="' + kind + '" aria-label="Gửi quà lễ" class="px-2.5 py-2 rounded-xl text-sm bg-amber-100 hover:bg-amber-200">🎁</button>'; }
  function celebPickerItems() {
    var out = [], seen = {};
    (celeb.gifts || []).forEach(function (g) {
      if (seen[g.id] || !CELEB_GIFTS[g.id]) return; seen[g.id] = 1;
      CELEB_GIFTS[g.id].forEach(function (it, i) { if (it[2] === "sticker" || it[2] === "card") out.push({ tok: "[[gift:" + g.id + ":" + i + "]]", it: it }); });
    });
    return out;
  }
  function celebPickerFill(box, kind) {
    var items = celebPickerItems();
    box.innerHTML = items.length ? items.map(function (x) { return '<button type="button" data-action="cel-send" data-kind="' + kind + '" data-tok="' + x.tok + '" title="' + esc(x.it[1]) + '">' + x.it[0] + "</button>"; }).join("") : '<span class="text-[11px] text-slate-500 px-2">Bạn chưa có thiệp/sticker lễ nào. Đăng nhập vào dịp lễ để nhận nhé!</span>';
  }
  Object.assign(actions, {
    "cel-picker": function (el) {
      var row = el.parentElement, old = row.parentElement.querySelector("#cel-picker");
      if (old) { old.remove(); return; }
      var box = document.createElement("div"); box.id = "cel-picker"; box.className = "cel-picker"; box.textContent = "Đang tải…";
      row.parentElement.insertBefore(box, row);
      if (celeb.gifts) celebPickerFill(box, el.dataset.kind);
      else celebSyncGifts().then(function () { if (box.isConnected) celebPickerFill(box, el.dataset.kind); });
    },
    "cel-send": function (el) {
      var tok = el.dataset.tok; if (!celebTokenItem(tok)) return;
      if (el.dataset.kind === "thread") { var box = $("#chat-text"); if (box) { box.value = tok; actions["chat-send"](); } }
      else if (sendChat(tok)) { refreshModal(); scrollChat(); }
    }
  });
