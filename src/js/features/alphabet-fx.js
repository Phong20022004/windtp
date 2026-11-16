  /* ===== Hiệu ứng cho học bảng chữ cái: cùng phong cách với các bài học khác =====
     Đúng: âm thanh vui + chùm ⭐✨💖 bắn ra + lời khen + nút nảy lên; sai: rung + lời động viên + nháy đỏ nhẹ;
     chuỗi đúng liên tiếp 🔥; xong bài: pháo giấy. Tôn trọng tùy chọn "giảm chuyển động" của hệ thống và công tắc âm thanh trong Cài đặt. */
  var AFX_PRAISE = ["Tuyệt vời!", "Chính xác!", "Giỏi lắm!", "Đúng rồi!"];
  var AFX_RETRY = ["Chưa đúng 😢", "Tiếc quá!", "Thử lại nhé!"];
  var AFX_EMOJI = ["⭐", "✨", "💖", "🎉", "🌟"];
  var AFX_COLORS = ["#f43f5e", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ec4899"];
  function afxReduced() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function afxPick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function afxLayer() {
    var L = document.createElement("div");
    L.className = "afx"; L.setAttribute("aria-hidden", "true");
    document.body.appendChild(L);
    window.setTimeout(function () { L.remove(); }, 3600);
    return L;
  }
  function afxCenter(rect) {
    var r = rect || { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top };
  }
  /** Chùm hiệu ứng tại vị trí `rect` (đã đo trước khi vẽ lại màn hình): ok = đúng / sai. */
  function afxBurst(ok, rect, label) {
    try { if (typeof sfx === "function") sfx(ok ? "right" : "wrong"); } catch (e) { }
    try { if (navigator.vibrate) navigator.vibrate(ok ? 30 : [80, 40, 80]); } catch (e) { }
    if (afxReduced()) return;
    var c = afxCenter(rect), L = afxLayer(), i, p;
    if (ok) {
      for (i = 0; i < 14; i++) {
        p = document.createElement("i"); var a = Math.PI * 2 * i / 14, d = 50 + Math.random() * 50;
        p.textContent = AFX_EMOJI[i % AFX_EMOJI.length];
        p.style.cssText = "left:" + c.x + "px;top:" + c.y + "px;--x:" + Math.cos(a) * d + "px;--y:" + (Math.sin(a) * d - 20) + "px";
        L.appendChild(p);
      }
    } else {
      L.appendChild(document.createElement("u"));
    }
    var b = document.createElement("b");
    b.textContent = label || afxPick(ok ? AFX_PRAISE : AFX_RETRY);
    if (!ok) b.className = "bd";
    b.style.cssText = "left:" + c.x + "px;top:" + Math.max(40, c.top - 8) + "px";
    L.appendChild(b);
  }
  /** Pháo giấy khi hoàn thành bài; `power` 0..1 quyết định số mảnh. */
  function afxConfetti(power) {
    try { if (typeof sfx === "function") sfx("coin"); } catch (e) { }
    if (afxReduced()) return;
    var L = afxLayer(), n = Math.round(30 + 50 * Math.max(0, Math.min(1, power))), i, p;
    L.classList.add("afc");
    for (i = 0; i < n; i++) {
      p = document.createElement("i");
      p.textContent = i % 5 === 0 ? AFX_EMOJI[i % AFX_EMOJI.length] : "";
      p.style.cssText = "left:" + (Math.random() * 100) + "vw;background:" + (i % 5 === 0 ? "transparent" : AFX_COLORS[i % AFX_COLORS.length]) +
        ";animation-duration:" + (1.6 + Math.random() * 1.4) + "s;animation-delay:" + (Math.random() * 0.5) + "s;--r:" + Math.round(Math.random() * 720 - 360) + "deg;--dx:" + Math.round(Math.random() * 120 - 60) + "px";
      L.appendChild(p);
    }
  }
  function afxClass(el, cls, ms) {
    if (!el || afxReduced()) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    window.setTimeout(function () { el.classList.remove(cls); }, ms || 700);
  }
  function afxIn() {
    if (afxReduced()) return;
    var kids = document.querySelectorAll("#tab-learn .space-y-4 > *:not(:first-child)");
    for (var i = 0; i < kids.length; i++) afxClass(kids[i], "a-in", 500);
  }
  /** Chuỗi đúng liên tiếp: cập nhật bộ đếm trong câu hỏi, thưởng thêm ở mốc 3, 5, 10. */
  function afxStreak(q, ok, rect) {
    q.streak = ok ? (q.streak || 0) + 1 : 0;
    if (ok && (q.streak === 3 || q.streak === 5 || q.streak === 10)) {
      try { if (typeof sfx === "function") sfx("coin"); } catch (e) { }
      return "🔥 Chuỗi " + q.streak + "!";
    }
    return null;
  }
  function afxWrap(id, fn) {
    var orig = actions[id];
    if (typeof orig !== "function") return;
    actions[id] = function (el) {
      var ctx = fn.before ? fn.before(el) : null, res = orig.apply(this, arguments);
      if (fn.after) fn.after(el, ctx);
      return res;
    };
  }

  // Trắc nghiệm chọn đáp án (nhìn chữ chọn âm, nghe chọn chữ, ôn chữ hay sai)
  afxWrap("alpha-ans", {
    before: function (el) {
      var c = alphaCurrent(), q = c && c.A.q;
      if (!q || q.picked != null) return null;
      var qi = q.order[q.n], pick = Number(el.dataset.i);
      return { q: q, qi: qi, pick: pick, ok: pick === qi, rect: el.getBoundingClientRect() };
    },
    after: function (el, x) {
      if (!x) return;
      var milestone = afxStreak(x.q, x.ok);
      afxBurst(x.ok, x.rect, milestone);
      var right = $('[data-action="alpha-ans"][data-i="' + x.qi + '"]'), wrong = x.ok ? null : $('[data-action="alpha-ans"][data-i="' + x.pick + '"]');
      afxClass(right, "a-pulse", 900);
      if (wrong) { afxClass(wrong, "a-shk", 600); afxClass($("#tab-learn .glass-card"), "a-shk", 600); }
    }
  });
  // Trắc nghiệm gõ lại
  afxWrap("alpha-check", {
    before: function () {
      var c = alphaCurrent(), q = c && c.A.q, inp = $("#alpha-type");
      if (!q || q.picked != null || !inp || !inp.value.trim()) return null;
      return { q: q, rect: inp.getBoundingClientRect() };
    },
    after: function (el, x) {
      if (!x || x.q.picked == null) return;
      var ok = x.q.picked === 1, milestone = afxStreak(x.q, ok);
      afxBurst(ok, x.rect, milestone);
      afxClass($("#tab-learn .glass-card"), ok ? "a-pulse" : "a-shk", 900);
    }
  });
  // Sang câu tiếp / kết thúc bài: câu mới trượt vào, xong bài thì bắn pháo giấy
  afxWrap("alpha-next", {
    before: function () { var c = alphaCurrent(); return c && c.A.q ? { q: c.A.q } : null; },
    after: function (el, x) {
      if (!x) return;
      if (x.q.n >= x.q.order.length) { if (x.q.order.length && x.q.score / x.q.order.length >= 0.6) afxConfetti(x.q.score / x.q.order.length); }
      else afxIn();
    }
  });
  // Thẻ ghi nhớ: lật thẻ 3D, biết / chưa biết, xong bộ thẻ
  afxWrap("alpha-flip", {
    after: function () {
      try { if (typeof sfx === "function") sfx("click"); } catch (e) { }
      afxClass($('[data-action="alpha-flip"]'), "a-flip", 600);
    }
  });
  afxWrap("alpha-know", {
    before: function (el) {
      var c = alphaCurrent(); if (!c || !c.A.deck) return null;
      return { A: c.A, ok: el.dataset.ok === "1", rect: el.getBoundingClientRect() };
    },
    after: function (el, x) {
      if (!x) return;
      if (x.ok) afxBurst(true, x.rect); else { try { if (typeof sfx === "function") sfx("wrong"); } catch (e) { } }
      if (x.A.deck && x.A.di >= x.A.deck.length) afxConfetti(x.A.stat[0] / Math.max(1, x.A.deck.length));
      else afxIn();
    }
  });
  // Ghép cặp: ghép đúng bắn pháo hoa nhỏ, nhầm thì rung; ghép xong bắn pháo giấy
  afxWrap("alpha-mright", {
    before: function (el) {
      var c = alphaCurrent(), m = c && c.A.m;
      if (!m || m.pick == null) return null;
      return { m: m, want: m.pick, got: Number(el.dataset.i), solved: m.solved.length, miss: m.miss, rect: el.getBoundingClientRect() };
    },
    after: function (el, x) {
      if (!x) return;
      if (x.m.solved.length > x.solved) {
        afxBurst(true, x.rect);
        afxClass($('[data-action="alpha-mleft"][data-i="' + x.want + '"]'), "a-pulse", 900);
        afxClass($('[data-action="alpha-mright"][data-i="' + x.got + '"]'), "a-pulse", 900);
        if (x.m.solved.length === x.m.pairs.length) afxConfetti(Math.max(0.3, 1 - x.m.miss * 0.1));
      } else if (x.m.miss > x.miss) {
        afxBurst(false, x.rect);
        afxClass($('[data-action="alpha-mright"][data-i="' + x.got + '"]'), "a-shk", 600);
      }
    }
  });
  // Tập viết: chấm đúng / chưa đúng
  afxWrap("alpha-wgrade", {
    before: function (el) { return { ok: el.dataset.ok === "1", rect: el.getBoundingClientRect() }; },
    after: function (el, x) { if (x) { afxBurst(x.ok, x.rect); afxIn(); } }
  });
  // Xem thẻ chữ: chữ được chọn nảy lên; chuyển chế độ / chữ khác: nội dung trượt vào
  afxWrap("alpha-pick", { after: function () { try { if (typeof sfx === "function") sfx("click"); } catch (e) { } afxClass($("#tab-learn .glass-card"), "a-pop", 600); } });
  afxWrap("alpha-mode", { after: afxIn });
  afxWrap("alpha-group", { after: afxIn });
  afxWrap("alpha-restart", { after: afxIn });
  afxWrap("alpha-wnext", { after: afxIn });
  afxWrap("alpha-wprev", { after: afxIn });
