  /* ===== Học bảng chữ cái / 214 bộ thủ: 9 cách học được cấu hình sẵn cho mọi ngôn ngữ ===== */
  // Cấu hình 9 cách học (thứ tự hiển thị). Thêm/bớt cách học chỉ cần sửa danh sách này và hàm vẽ tương ứng trong ALPHA_VIEWS.
  var ALPHA_MODES = [
    { id: "cards", icon: "🃏", title: "Xem thẻ chữ", desc: "Xem toàn bộ chữ, bấm để xem cách đọc và ví dụ." },
    { id: "listen", icon: "🔊", title: "Nghe phát âm", desc: "Nghe từng chữ hoặc cả nhóm đọc liên tục." },
    { id: "write", icon: "✍️", title: "Tập viết", desc: "Viết tay lên khung có chữ mẫu mờ, rồi tự chấm." },
    { id: "flash", icon: "🔄", title: "Flashcard lật", desc: "Lật thẻ để nhớ, đánh dấu biết hoặc chưa biết." },
    { id: "see", icon: "👁️", title: "Nhìn chữ chọn âm", desc: "Thấy chữ, chọn cách đọc đúng trong 4 đáp án." },
    { id: "hear", icon: "👂", title: "Nghe chọn chữ", desc: "Nghe phát âm, chọn đúng chữ trong 4 đáp án." },
    { id: "match", icon: "🧩", title: "Ghép cặp", desc: "Nối chữ với cách đọc, 6 cặp mỗi lượt." },
    { id: "type", icon: "⌨️", title: "Gõ lại", desc: "Gõ cách đọc của chữ (hoặc nghe rồi gõ chữ cái)." },
    { id: "weak", icon: "🎯", title: "Ôn chữ hay sai", desc: "Tự gom những chữ bạn hay nhầm để luyện lại." }
  ];
  var ALPHA_QUIZ_LEN = 10;
  var alphaSpeakGen = 0;

  function alphaState() {
    if (!ui.alpha) ui.alpha = { mode: null, group: "all", sel: null, wi: 0, guide: true, drawn: false, freeze: false, deck: null, di: 0, flip: false, q: null, m: null, playing: false };
    return ui.alpha;
  }
  function alphaCfg(lang) { return ALPHA_DATA.get(lang.code); }
  function alphaFlat(cfg) {
    if (!cfg._flat) { cfg._flat = []; cfg.groups.forEach(function (g, gi) { g.items.forEach(function (it) { cfg._flat.push({ it: it, g: gi }); }); }); }
    return cfg._flat;
  }
  function alphaScope(cfg, A) {
    var flat = alphaFlat(cfg);
    var out = [];
    flat.forEach(function (f, i) { if (A.group === "all" || f.g === A.group) out.push(i); });
    return out;
  }
  function alphaRec(code, key) {
    var r = state.alpha && state.alpha[code] && state.alpha[code][key];
    return Array.isArray(r) ? [Number(r[0]) || 0, Number(r[1]) || 0] : [0, 0];
  }
  function alphaMark(code, key, ok) {
    if (!state.alpha || typeof state.alpha !== "object") state.alpha = {};
    if (!state.alpha[code]) state.alpha[code] = {};
    var r = alphaRec(code, key);
    state.alpha[code][key] = ok ? [Math.min(r[0] + 1, 999), r[1]] : [r[0], Math.min(r[1] + 1, 999)];
    commit();
  }
  function alphaMastered(rec) { return rec[0] >= 2 && rec[0] > rec[1]; }
  function alphaWeak(cfg, code) {
    var out = [];
    alphaFlat(cfg).forEach(function (f, i) { var r = alphaRec(code, f.it.c); if (r[1] > 0 && r[0] < r[1] + 2) out.push(i); });
    return out;
  }
  function alphaShuffle(a) { var b = a.slice(); for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
  function alphaNorm(s) { return ALPHA_DATA.stripTone(String(s || "").toLowerCase().trim()).replace(/[\s\-·.]/g, ""); }
  // Các cách gõ được chấp nhận cho một chữ (bỏ dấu thanh, không phân biệt hoa thường).
  function alphaAnswers(cfg, it) {
    if (cfg.typeMode === "dictate") return String(it.c).toLowerCase().split(/\s+/).filter(Boolean);
    var out = [];
    String(it.r).split("/").forEach(function (part) {
      var m = part.match(/\(([^)]*)\)/), base = part.replace(/\(.*?\)/g, "");
      if (alphaNorm(base)) out.push(alphaNorm(base));
      if (m && /^[a-z\-\s]+$/i.test(m[1]) && alphaNorm(m[1])) out.push(alphaNorm(m[1]));
    });
    (it.a || []).forEach(function (x) { if (alphaNorm(x)) out.push(alphaNorm(x)); });
    return out;
  }
  function alphaShort(it) { return String(it.r).split(" / ")[0].replace(/\s*\(.*\)/, ""); }
  function alphaKey(cfg, it) { return alphaAnswers(cfg, it)[0] || it.c; }

  function alphaSpeak(cfg, text, done) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") { toast("Thiết bị này chưa hỗ trợ đọc giọng nói"); if (done) done(); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = cfg.tts; u.rate = 0.85;
      var voices = window.speechSynthesis.getVoices().filter(function (v) { return String(v.lang).replace("_", "-").toLowerCase() === cfg.tts.toLowerCase(); });
      if (voices.length) u.voice = voices[0];
      if (done) { u.onend = done; u.onerror = done; }
      window.speechSynthesis.speak(u);
    } catch (e) { if (done) done(); }
  }
  function alphaStopSpeak() { alphaSpeakGen++; try { window.speechSynthesis.cancel(); } catch (e) { } }

  // Chữ lớn: chữ ghép nhiều ký tự (âm ghép, chữ hoa + thường) dùng cỡ nhỏ hơn
  function alphaBig(it, px) { var n = Array.from(it.c).length; var s = n > 1 ? Math.round(px * (n > 3 ? 0.5 : 0.65)) : px; return '<span style="font-size:' + s + 'px;line-height:1.1">' + esc(it.c) + '</span>'; }

  function alphaHeader(cfg, lang, A) {
    var flat = alphaFlat(cfg), total = flat.length, done = 0;
    flat.forEach(function (f) { if (alphaMastered(alphaRec(lang.code, f.it.c))) done++; });
    var pct = Math.round(done * 100 / total);
    return '<button data-action="alpha-back" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700">← ' + (A.mode ? "Quay lại" : "Không gian học") + '</button>' +
      '<div class="rounded-3xl p-5 bg-gradient-to-r from-violet-600 to-sky-600 text-white keep-white"><p class="text-xs font-bold opacity-90">' + lang.flag + ' ' + esc(lang.name).toUpperCase() + '</p><h2 class="text-2xl font-black mt-1">' + esc(cfg.title) + '</h2><p class="text-sm mt-1 opacity-90">' + esc(cfg.intro) + '</p>' +
      '<div class="mt-3 h-2 rounded-full bg-white/25 overflow-hidden"><div class="h-full bg-white" style="width:' + pct + '%"></div></div><p class="text-[11px] font-bold mt-1 opacity-90">Đã thuộc ' + done + '/' + total + ' (' + pct + '%)</p></div>';
  }
  function alphaChips(cfg, A) {
    var chips = '<button data-action="alpha-group" data-g="all" aria-pressed="' + (A.group === "all") + '" class="px-3 py-1.5 rounded-full text-[11px] font-bold border ' + (A.group === "all" ? "bg-sky-600 text-white keep-white border-sky-600" : "bg-white text-slate-600 border-slate-200") + '">Tất cả</button>';
    cfg.groups.forEach(function (g, gi) { chips += '<button data-action="alpha-group" data-g="' + gi + '" aria-pressed="' + (A.group === gi) + '" class="px-3 py-1.5 rounded-full text-[11px] font-bold border ' + (A.group === gi ? "bg-sky-600 text-white keep-white border-sky-600" : "bg-white text-slate-600 border-slate-200") + '">' + esc(g.name) + '</button>'; });
    return '<div class="flex flex-wrap gap-2" role="group" aria-label="Chọn nhóm chữ">' + chips + '</div>';
  }
  function alphaEmpty(msg) { return '<div class="glass-card rounded-3xl p-6 text-center text-sm text-slate-600">' + msg + '</div>'; }

  var ALPHA_VIEWS = {
    cards: function (cfg, lang, A) {
      var flat = alphaFlat(cfg), html = "";
      cfg.groups.forEach(function (g, gi) {
        if (A.group !== "all" && A.group !== gi) return;
        html += '<p class="text-xs font-extrabold text-slate-700 mt-2">' + esc(g.name) + '</p><div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">';
        flat.forEach(function (f, i) {
          if (f.g !== gi) return;
          var m = alphaMastered(alphaRec(lang.code, f.it.c));
          html += '<button data-action="alpha-pick" data-i="' + i + '" aria-pressed="' + (A.sel === i) + '" class="rounded-2xl border ' + (A.sel === i ? "border-sky-500 ring-2 ring-sky-300" : "border-slate-200") + ' bg-white p-2 flex flex-col items-center hover:border-sky-400" aria-label="' + esc(f.it.c + " " + f.it.r) + '">' +
            '<span class="text-slate-800 font-black">' + alphaBig(f.it, 28) + '</span><span class="text-[10px] text-slate-500 mt-1 truncate max-w-full">' + esc(alphaShort(f.it)) + '</span>' + (m ? '<span class="text-[10px] text-emerald-600">✓</span>' : "") + '</button>';
        });
        html += '</div>';
      });
      var detail = "";
      if (A.sel != null && flat[A.sel]) {
        var it = flat[A.sel].it;
        detail = '<div class="glass-card rounded-3xl p-5 text-center space-y-2"><div class="text-slate-800 font-black">' + alphaBig(it, 96) + '</div><p class="text-lg font-extrabold text-sky-700">' + esc(it.r) + '</p>' +
          (it.x ? '<p class="text-sm text-slate-600">' + esc(it.x) + '</p>' : "") +
          '<button data-action="alpha-say" data-i="' + A.sel + '" class="px-4 py-2 rounded-xl bg-sky-600 text-white keep-white text-xs font-bold">🔊 Nghe</button></div>';
      }
      return detail + html;
    },
    listen: function (cfg, lang, A) {
      var flat = alphaFlat(cfg), scope = alphaScope(cfg, A);
      var rowsHtml = scope.map(function (i) {
        var it = flat[i].it;
        return '<div class="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 px-3 py-2" data-alpha-row="' + i + '"><span class="w-14 text-center text-slate-800 font-black">' + alphaBig(it, 28) + '</span><div class="flex-1 min-w-0"><p class="text-sm font-bold text-slate-800">' + esc(it.r) + '</p><p class="text-[11px] text-slate-500 truncate">' + esc(it.x) + '</p></div><button data-action="alpha-say" data-i="' + i + '" class="px-3 py-2 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold" aria-label="Nghe ' + esc(it.c) + '">🔊</button></div>';
      }).join("");
      return '<div class="flex gap-2"><button data-action="alpha-playall" class="px-4 py-2 rounded-xl bg-emerald-600 text-white keep-white text-xs font-bold">' + (A.playing ? "⏹ Dừng" : "▶ Nghe cả nhóm") + '</button></div><div class="space-y-2">' + rowsHtml + '</div>';
    },
    write: function (cfg, lang, A) {
      var flat = alphaFlat(cfg), scope = alphaScope(cfg, A);
      if (!scope.length) return alphaEmpty("Nhóm này chưa có chữ.");
      A.wi = Math.max(0, Math.min(A.wi, scope.length - 1));
      var it = flat[scope[A.wi]].it;
      return '<div class="glass-card rounded-3xl p-4 space-y-3"><div class="flex items-center justify-between text-xs text-slate-500"><span>Chữ ' + (A.wi + 1) + '/' + scope.length + '</span><span class="font-bold text-sky-700">' + esc(it.r) + '</span></div>' +
        (it.x ? '<p class="text-xs text-slate-600">' + esc(it.x) + '</p>' : "") +
        '<div class="relative mx-auto" style="width:300px;max-width:100%;aspect-ratio:1/1"><div class="absolute inset-0 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center select-none pointer-events-none" aria-hidden="true" style="color:' + (A.guide ? "rgba(100,116,139,.28)" : "transparent") + '">' + alphaBig(it, 210) + '</div>' +
        '<canvas id="alpha-canvas" role="img" class="absolute inset-0 w-full h-full rounded-2xl" style="touch-action:none" aria-label="Khung tập viết bằng chuột hoặc ngón tay. Nếu không vẽ được, hãy dùng các nút bên dưới để nghe, chuyển chữ và tự chấm."></canvas></div>' +
        '<div class="flex flex-wrap justify-center gap-2"><button data-action="alpha-wprev" aria-label="Chữ trước" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold">◀</button><button data-action="alpha-say" data-i="' + scope[A.wi] + '" aria-label="Nghe chữ này" class="px-3 py-2 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold">🔊</button><button data-action="alpha-wclear" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold">🧹 Xóa</button><button data-action="alpha-wguide" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold">👁 Chữ mẫu</button><button data-action="alpha-wnext" aria-label="Chữ sau" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold">▶</button></div>' +
        '<div class="flex justify-center gap-2"><button data-action="alpha-wgrade" data-ok="1" class="px-4 py-2 rounded-xl bg-emerald-600 text-white keep-white text-xs font-bold">✅ Viết đúng</button><button data-action="alpha-wgrade" data-ok="0" class="px-4 py-2 rounded-xl bg-rose-500 text-white keep-white text-xs font-bold">🔁 Cần luyện thêm</button></div></div>';
    },
    flash: function (cfg, lang, A) {
      var flat = alphaFlat(cfg);
      if (!A.deck) { A.deck = alphaShuffle(alphaScope(cfg, A)); A.di = 0; A.flip = false; A.stat = [0, 0]; }
      if (!A.deck.length) return alphaEmpty("Nhóm này chưa có chữ.");
      if (A.di >= A.deck.length) return alphaEmpty('<p class="font-extrabold text-slate-800 text-base">Hoàn thành bộ thẻ! 🎉</p><p class="mt-1">Biết: ' + A.stat[0] + ' · Chưa biết: ' + A.stat[1] + '</p><button data-action="alpha-restart" class="mt-3 px-4 py-2 rounded-xl bg-sky-600 text-white keep-white text-xs font-bold">Học lại bộ thẻ</button>');
      var it = flat[A.deck[A.di]].it;
      var face = A.flip
        ? '<p class="text-3xl font-black text-sky-700">' + esc(it.r) + '</p>' + (it.x ? '<p class="text-sm text-slate-600 mt-2">' + esc(it.x) + '</p>' : "")
        : '<div class="text-slate-800 font-black">' + alphaBig(it, 110) + '</div><p class="text-[11px] text-slate-400 mt-2">Bấm để lật</p>';
      return '<p class="text-xs text-slate-500 text-center">Thẻ ' + (A.di + 1) + '/' + A.deck.length + '</p>' +
        '<button data-action="alpha-flip" class="w-full glass-card rounded-3xl p-8 min-h-[230px] flex flex-col items-center justify-center text-center" aria-label="Lật thẻ">' + face + '</button>' +
        '<div class="flex justify-center gap-2"><button data-action="alpha-say" data-i="' + A.deck[A.di] + '" class="px-3 py-2 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold">🔊</button><button data-action="alpha-know" data-ok="1" class="px-4 py-2 rounded-xl bg-emerald-600 text-white keep-white text-xs font-bold">✅ Đã biết</button><button data-action="alpha-know" data-ok="0" class="px-4 py-2 rounded-xl bg-rose-500 text-white keep-white text-xs font-bold">❓ Chưa biết</button></div>';
    },
    see: function (cfg, lang, A) { return alphaQuizView(cfg, lang, A, "see"); },
    hear: function (cfg, lang, A) { return alphaQuizView(cfg, lang, A, "hear"); },
    type: function (cfg, lang, A) { return alphaQuizView(cfg, lang, A, "type"); },
    weak: function (cfg, lang, A) { return alphaQuizView(cfg, lang, A, "weak"); },
    match: function (cfg, lang, A) {
      var flat = alphaFlat(cfg);
      if (!A.m) alphaNewMatch(cfg, A);
      var m = A.m;
      if (!m.pairs.length) return alphaEmpty("Nhóm này chưa đủ chữ khác âm để ghép cặp.");
      var done = m.solved.length === m.pairs.length;
      var left = m.left.map(function (i) {
        var s = m.solved.indexOf(i) >= 0, sel = m.pick === i;
        return '<button data-action="alpha-mleft" data-i="' + i + '"' + (s ? " disabled" : "") + ' class="w-full rounded-2xl border p-3 text-slate-800 font-black ' + (s ? "bg-emerald-50 border-emerald-300 opacity-60" : sel ? "border-sky-500 ring-2 ring-sky-300 bg-white" : "border-slate-200 bg-white") + '">' + alphaBig(flat[i].it, 30) + '</button>';
      }).join("");
      var right = m.right.map(function (i) {
        var s = m.solved.indexOf(i) >= 0;
        return '<button data-action="alpha-mright" data-i="' + i + '"' + (s ? " disabled" : "") + ' class="w-full rounded-2xl border p-3 text-sm font-bold ' + (s ? "bg-emerald-50 border-emerald-300 text-emerald-700 opacity-60" : "border-slate-200 bg-white text-slate-700") + '">' + esc(alphaShort(flat[i].it)) + '</button>';
      }).join("");
      return '<p class="text-xs text-slate-500 text-center">Đã ghép ' + m.solved.length + '/' + m.pairs.length + ' · Nhầm ' + m.miss + ' lần</p><div class="grid grid-cols-2 gap-3"><div class="space-y-2">' + left + '</div><div class="space-y-2">' + right + '</div></div>' +
        (done ? '<div class="glass-card rounded-3xl p-4 text-center text-sm font-bold text-emerald-700">Ghép xong! 🎉 <button data-action="alpha-restart" class="ml-2 px-3 py-1.5 rounded-xl bg-sky-600 text-white keep-white text-xs">Lượt mới</button></div>' : "");
    }
  };

  function alphaNewMatch(cfg, A) {
    var flat = alphaFlat(cfg), seen = {}, pool = [];
    alphaShuffle(alphaScope(cfg, A)).forEach(function (i) { var k = alphaKey(cfg, flat[i].it); if (!seen[k]) { seen[k] = 1; pool.push(i); } });
    var pairs = pool.slice(0, 6);
    A.m = { pairs: pairs, left: alphaShuffle(pairs), right: alphaShuffle(pairs), solved: [], pick: null, miss: 0 };
  }

  // ----- Bộ câu hỏi dùng chung cho: nhìn chữ chọn âm, nghe chọn chữ, gõ lại, ôn chữ hay sai -----
  function alphaQuizPool(cfg, lang, A, kind) {
    return kind === "weak" ? alphaWeak(cfg, lang.code) : alphaScope(cfg, A);
  }
  function alphaOptions(cfg, A, qi) {
    var flat = alphaFlat(cfg), key = alphaKey(cfg, flat[qi].it), used = {}, out = [qi];
    used[key] = 1;
    var scope = alphaScope(cfg, A);
    var pools = [scope.length >= 4 ? scope : [], flat.map(function (f, i) { return i; })];
    pools.forEach(function (pool) {
      alphaShuffle(pool).forEach(function (i) { var k = alphaKey(cfg, flat[i].it); if (out.length < 4 && !used[k]) { used[k] = 1; out.push(i); } });
    });
    return alphaShuffle(out);
  }
  function alphaStartQuiz(cfg, lang, A, kind) {
    var pool = alphaShuffle(alphaQuizPool(cfg, lang, A, kind)).slice(0, ALPHA_QUIZ_LEN);
    A.q = { kind: kind, order: pool, n: 0, score: 0, picked: null, opts: pool.length ? (kind === "type" ? [] : alphaOptions(cfg, A, pool[0])) : [], typed: "" };
  }
  function alphaQuizView(cfg, lang, A, kind) {
    var flat = alphaFlat(cfg);
    if (!A.q || A.q.kind !== kind) alphaStartQuiz(cfg, lang, A, kind);
    var q = A.q;
    if (!q.order.length) return alphaEmpty(kind === "weak" ? "Chưa có chữ hay sai 🎉<br>Hãy làm các bài trắc nghiệm, những chữ bạn nhầm sẽ xuất hiện ở đây." : "Nhóm này chưa có chữ.");
    if (q.n >= q.order.length) return alphaEmpty('<p class="font-extrabold text-slate-800 text-base">Kết quả: ' + q.score + '/' + q.order.length + '</p><p class="mt-1">' + (q.score === q.order.length ? "Tuyệt vời! 🎉" : "Cố gắng thêm nhé.") + '</p><button data-action="alpha-restart" class="mt-3 px-4 py-2 rounded-xl bg-sky-600 text-white keep-white text-xs font-bold">Làm lượt mới</button>');
    var qi = q.order[q.n], it = flat[qi].it;
    var head = '<p class="text-xs text-slate-500 text-center">Câu ' + (q.n + 1) + '/' + q.order.length + ' · Đúng ' + q.score + '</p>';
    var next = q.picked != null ? '<div class="text-center"><button data-action="alpha-next" class="px-5 py-2 rounded-xl bg-sky-600 text-white keep-white text-xs font-bold">Tiếp →</button></div>' : "";
    if (kind === "type") {
      var dict = cfg.typeMode === "dictate";
      var prompt = dict ? '<button data-action="alpha-say" data-i="' + qi + '" class="px-6 py-4 rounded-2xl bg-sky-600 text-white keep-white text-2xl font-black" aria-label="Nghe lại">🔊</button><p class="text-xs text-slate-500 mt-2">Nghe và gõ chữ cái bạn nghe được</p>' : '<div class="text-slate-800 font-black">' + alphaBig(it, 96) + '</div><p class="text-xs text-slate-500 mt-2">Gõ cách đọc (không cần dấu thanh)' + (cfg.kind === "radicals" ? ", hoặc âm Hán Việt" : "") + '</p>';
      var res = q.picked == null ? "" : '<p role="status" aria-live="polite" class="text-sm font-bold ' + (q.picked === 1 ? "text-emerald-600" : "text-rose-600") + '">' + (q.picked === 1 ? "Chính xác! " : "Chưa đúng. ") + 'Đáp án: ' + esc(dict ? it.c : it.r) + '</p>';
      return head + '<div class="glass-card rounded-3xl p-6 text-center space-y-3">' + prompt + '<div class="flex gap-2 justify-center"><input id="alpha-type" type="text" autocomplete="off" autocapitalize="off" maxlength="40" value="' + esc(q.typed) + '"' + (q.picked != null ? " disabled" : "") + ' class="w-40 px-3 py-2 text-center rounded-xl border border-slate-300 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-400" aria-label="Đáp án"><button data-action="alpha-check" ' + (q.picked != null ? "disabled " : "") + 'class="px-4 py-2 rounded-xl bg-emerald-600 text-white keep-white text-xs font-bold">Kiểm tra</button></div>' + res + '</div>' + next;
    }
    var hear = kind === "hear";
    var prompt2 = hear
      ? '<button data-action="alpha-say" data-i="' + qi + '" class="px-6 py-4 rounded-2xl bg-sky-600 text-white keep-white text-2xl font-black" aria-label="Nghe lại">🔊</button><p class="text-xs text-slate-500 mt-2">Nghe và chọn chữ đúng</p>'
      : '<div class="text-slate-800 font-black">' + alphaBig(it, 96) + '</div><p class="text-xs text-slate-500 mt-2">Chọn cách đọc đúng</p>';
    var opts = q.opts.map(function (oi) {
      var o = flat[oi].it, state_ = "border-slate-200 bg-white";
      if (q.picked != null) state_ = oi === qi ? "border-emerald-500 bg-emerald-50" : (oi === q.picked ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white opacity-70");
      var mark = q.picked == null ? "" : (oi === qi ? " ✓" : (oi === q.picked ? " ✗" : ""));
      return '<button data-action="alpha-ans" data-i="' + oi + '"' + (q.picked != null ? " disabled" : "") + (mark ? ' aria-label="' + esc(o.c + " " + o.r + (oi === qi ? " — đáp án đúng" : " — bạn đã chọn, chưa đúng")) + '"' : "") + ' class="rounded-2xl border p-3 ' + state_ + ' text-slate-800 ' + (hear ? "font-black" : "text-sm font-bold") + '">' + (hear ? alphaBig(o, 34) : esc(alphaShort(o))) + mark + '</button>';
    }).join("");
    var fb = q.picked == null ? "" : '<p role="status" aria-live="polite" class="text-sm text-center ' + (q.picked === qi ? "text-emerald-600" : "text-rose-600") + ' font-bold">' + (q.picked === qi ? "Chính xác!" : "Chưa đúng") + ' · ' + esc(it.c) + ' = ' + esc(it.r) + '</p>';
    return head + '<div class="glass-card rounded-3xl p-6 text-center">' + prompt2 + '</div><div class="grid grid-cols-2 gap-2">' + opts + '</div>' + fb + next;
  }

  function alphaRenderPicker(cfg, lang) {
    return '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + ALPHA_MODES.map(function (m, i) {
      return '<button data-action="alpha-mode" data-m="' + m.id + '" class="text-left glass-card rounded-3xl p-4 border-0 shadow hover:shadow-lg transition-all"><div class="flex items-center gap-3"><span class="text-3xl">' + m.icon + '</span><div><p class="text-sm font-black text-teal-700">' + (i + 1) + '. ' + esc(m.title) + '</p><p class="text-[11px] text-slate-600 mt-0.5">' + esc(m.desc) + '</p></div></div></button>';
    }).join("") + '<button data-action="alpha-everest" class="text-left rounded-3xl p-4 shadow hover:shadow-lg transition-all sm:col-span-2 text-white keep-white" style="background:linear-gradient(120deg,#0ea5e9,#6366f1)"><div class="flex items-center gap-3"><span class="text-3xl">🏔️</span><div><p class="text-sm font-black">Leo núi giải cứu</p><p class="text-[11px] opacity-90 mt-0.5">Giúp hoàng tử leo đỉnh Everest cứu công chúa: trả lời đúng lên 1 bậc, sai lùi 3 bậc. Giống màn chơi của các giáo trình.</p></div></div></button>' + '<button data-action="alpha-mode" data-m="duel" class="text-left rounded-3xl p-4 shadow hover:shadow-lg transition-all sm:col-span-2 text-white keep-white" style="background:linear-gradient(120deg,#e11d48,#7c3aed)"><div class="flex items-center gap-3"><span class="text-3xl">⚔️</span><div><p class="text-sm font-black">Thách đấu bạn bè</p><p class="text-[11px] opacity-90 mt-0.5">Cả hai thi cùng một đề về ' + (cfg.kind === "radicals" ? "bộ thủ" : "chữ cái") + ', tính điểm theo độ đúng, tốc độ và chuỗi đúng. Cần Premium.</p></div></div></button></div>';
  }

  function renderAlphabet(el, lang) {
    var cfg = alphaCfg(lang), A = alphaState();
    var body;
    if (!A.mode) body = alphaRenderPicker(cfg, lang);
    else if (A.mode === "duel") body = '<p class="text-sm font-black text-slate-800">⚔️ Thách đấu bạn bè</p>' + alphaDuelView(cfg, lang, A);
    else {
      var def = ALPHA_MODES.filter(function (m) { return m.id === A.mode; })[0];
      var needChips = A.mode !== "weak";
      body = '<p class="text-sm font-black text-slate-800">' + def.icon + ' ' + esc(def.title) + '</p>' + (needChips ? alphaChips(cfg, A) : "") + ALPHA_VIEWS[A.mode](cfg, lang, A);
    }
    el.innerHTML = '<div class="space-y-4">' + alphaHeader(cfg, lang, A) + body + '</div>';
    if (A.mode === "write") alphaBindCanvas(A);
    if (A.mode === "type") alphaBindType();
  }

  function alphaBindType() {
    var inp = $("#alpha-type");
    if (!inp || inp.disabled) { return; }
    inp.focus();
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); var b = $('[data-action="alpha-check"]'); if (b) b.click(); } });
  }
  function alphaBindCanvas(A) {
    var cv = $("#alpha-canvas");
    if (!cv) return;
    var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    var ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 9; ctx.strokeStyle = "#0284c7";
    var down = false, last = null;
    function pt(e) { var b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
    cv.addEventListener("pointerdown", function (e) { e.preventDefault(); down = true; last = pt(e); try { cv.setPointerCapture(e.pointerId); } catch (er) { } ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(last.x + 0.01, last.y + 0.01); ctx.stroke(); A.drawn = true; A.freeze = true; });
    cv.addEventListener("pointermove", function (e) { if (!down) return; e.preventDefault(); var p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
    var up = function () { down = false; last = null; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  }

  // ----- Hành động -----
  function alphaRerender() { var lang = state.lang ? langByCode(state.lang) : null, el = $("#tab-learn"); if (lang && el && ui.learnStage === "alphabet") renderAlphabet(el, lang); }
  function alphaCurrent() { var lang = state.lang ? langByCode(state.lang) : null; return lang ? { lang: lang, cfg: alphaCfg(lang), A: alphaState() } : null; }
  function alphaResetRun(A) { A.deck = null; A.di = 0; A.flip = false; A.q = null; A.m = null; A.sel = null; A.wi = 0; A.drawn = false; A.freeze = false; A.playing = false; A.duel = null; window.clearInterval(alphaDuelTimer); alphaStopSpeak(); }

  Object.assign(actions, {
    "open-alphabet": function () { ui.alpha = null; alphaState(); ui.learnStage = "alphabet"; renderLearn(); window.scrollTo({ top: 0, behavior: "smooth" }); },
    "alpha-back": function () {
      var A = alphaState();
      if (A.mode) { alphaResetRun(A); A.mode = null; alphaRerender(); }
      else { alphaStopSpeak(); ui.learnStage = "menu"; renderLearn(); }
    },
    "alpha-everest": function () {
      var c = alphaCurrent(); if (!c) return;
      alphaResetRun(c.A);
      alphaEverestOpen(c.lang, c.cfg, function () { alphaRerender(); });
    },
    "alpha-mode": function (el) { var A = alphaState(); alphaResetRun(A); A.mode = el.dataset.m; alphaRerender(); },
    "alpha-group": function (el) { var A = alphaState(); alphaResetRun(A); A.group = el.dataset.g === "all" ? "all" : Number(el.dataset.g); alphaRerender(); },
    "alpha-pick": function (el) { var A = alphaState(); A.sel = Number(el.dataset.i); alphaRerender(); var c = alphaCurrent(); if (c) alphaSpeak(c.cfg, alphaFlat(c.cfg)[A.sel].it.t); },
    "alpha-say": function (el) { var c = alphaCurrent(); if (!c) return; var f = alphaFlat(c.cfg)[Number(el.dataset.i)]; if (f) alphaSpeak(c.cfg, f.it.t); },
    "alpha-playall": function () {
      var c = alphaCurrent(); if (!c) return;
      var A = c.A, flat = alphaFlat(c.cfg), scope = alphaScope(c.cfg, A);
      if (A.playing) { alphaStopSpeak(); A.playing = false; alphaRerender(); return; }
      A.playing = true; var gen = ++alphaSpeakGen, k = 0;
      alphaRerender();
      (function step() {
        if (gen !== alphaSpeakGen || k >= scope.length) { if (gen === alphaSpeakGen) { A.playing = false; alphaRerender(); } return; }
        var row = $('[data-alpha-row="' + scope[k] + '"]'); if (row) { row.scrollIntoView({ block: "nearest" }); row.classList.add("ring-2", "ring-sky-300"); }
        var cur = scope[k++];
        alphaSpeak(c.cfg, flat[cur].it.t, function () { var r2 = $('[data-alpha-row="' + cur + '"]'); if (r2) r2.classList.remove("ring-2", "ring-sky-300"); window.setTimeout(step, 350); });
      })();
    },
    "alpha-wprev": function () { var c = alphaCurrent(); if (!c) return; var n = alphaScope(c.cfg, c.A).length; c.A.wi = (c.A.wi - 1 + n) % n; c.A.drawn = false; c.A.freeze = false; alphaRerender(); },
    "alpha-wnext": function () { var c = alphaCurrent(); if (!c) return; var n = alphaScope(c.cfg, c.A).length; c.A.wi = (c.A.wi + 1) % n; c.A.drawn = false; c.A.freeze = false; alphaRerender(); },
    "alpha-wclear": function () { var A = alphaState(); A.drawn = false; A.freeze = false; alphaRerender(); },
    "alpha-wguide": function () { var A = alphaState(); A.guide = !A.guide; A.drawn = false; A.freeze = false; alphaRerender(); },
    "alpha-wgrade": function (el) {
      var c = alphaCurrent(); if (!c) return;
      var scope = alphaScope(c.cfg, c.A), it = alphaFlat(c.cfg)[scope[c.A.wi]].it;
      c.A.drawn = false; c.A.freeze = false;
      c.A.wi = (c.A.wi + 1) % scope.length;
      alphaMark(c.lang.code, it.c, el.dataset.ok === "1");
      alphaRerender();
    },
    "alpha-flip": function () { var A = alphaState(); A.flip = !A.flip; alphaRerender(); },
    "alpha-know": function (el) {
      var c = alphaCurrent(); if (!c || !c.A.deck) return;
      var A = c.A, it = alphaFlat(c.cfg)[A.deck[A.di]].it, ok = el.dataset.ok === "1";
      A.stat[ok ? 0 : 1]++; A.di++; A.flip = false;
      alphaMark(c.lang.code, it.c, ok);
      alphaRerender();
    },
    "alpha-restart": function () { var A = alphaState(); var m = A.mode; alphaResetRun(A); A.mode = m; alphaRerender(); },
    "alpha-ans": function (el) {
      var c = alphaCurrent(); if (!c || !c.A.q || c.A.q.picked != null) return;
      var q = c.A.q, qi = q.order[q.n], it = alphaFlat(c.cfg)[qi].it, pick = Number(el.dataset.i), ok = pick === qi;
      q.picked = pick; if (ok) q.score++;
      alphaMark(c.lang.code, it.c, ok);
      alphaRerender();
    },
    "alpha-check": function () {
      var c = alphaCurrent(); if (!c || !c.A.q || c.A.q.picked != null) return;
      var inp = $("#alpha-type"), q = c.A.q, qi = q.order[q.n], it = alphaFlat(c.cfg)[qi].it;
      var typed = inp ? inp.value : "";
      if (!typed.trim()) { toast("Hãy gõ đáp án"); return; }
      var dict = c.cfg.typeMode === "dictate";
      var norm = dict ? typed.toLowerCase().trim() : alphaNorm(typed);
      var ok = alphaAnswers(c.cfg, it).indexOf(norm) >= 0;
      q.typed = typed; q.picked = ok ? 1 : 0; if (ok) q.score++;
      alphaMark(c.lang.code, it.c, ok);
      alphaRerender();
    },
    "alpha-next": function () {
      var c = alphaCurrent(); if (!c || !c.A.q) return;
      var q = c.A.q; q.n++; q.picked = null; q.typed = "";
      if (q.n < q.order.length && q.kind !== "type") q.opts = alphaOptions(c.cfg, c.A, q.order[q.n]);
      alphaRerender();
      if (q.n < q.order.length && (q.kind === "hear" || (q.kind === "type" && c.cfg.typeMode === "dictate"))) alphaSpeak(c.cfg, alphaFlat(c.cfg)[q.order[q.n]].it.t);
    },
    "alpha-mleft": function (el) { var A = alphaState(); if (!A.m) return; A.m.pick = Number(el.dataset.i); alphaRerender(); },
    "alpha-mright": function (el) {
      var c = alphaCurrent(); if (!c || !c.A.m || c.A.m.pick == null) { toast("Hãy chọn chữ ở cột bên trái trước"); return; }
      var m = c.A.m, want = m.pick, got = Number(el.dataset.i), it = alphaFlat(c.cfg)[want].it;
      var ok = alphaKey(c.cfg, alphaFlat(c.cfg)[got].it) === alphaKey(c.cfg, it);
      if (ok) { m.solved.push(want); m.pick = null; } else { m.miss++; m.pick = null; }
      alphaMark(c.lang.code, it.c, ok);
      alphaRerender();
    }
  });

  // Mở bảng chữ cái từ menu học: vẽ thêm một thẻ vào lưới cách học của mọi ngôn ngữ; nhịp vẽ lại không xóa nét đang viết.
  var alphaPrevRenderLearn = renderLearn;
  renderLearn = function () {
    var el = $("#tab-learn"), lang = state.lang ? langByCode(state.lang) : null;
    if (el && lang && ui.learnStage === "alphabet" && ALPHA_DATA.get(lang.code)) {
      if (ui.alpha && ui.alpha.freeze && ui.alpha.mode === "write" && $("#alpha-canvas")) return;
      renderAlphabet(el, lang);
      return;
    }
    alphaPrevRenderLearn.apply(this, arguments);
    if (el && lang && ui.learnStage === "menu" && ALPHA_DATA.get(lang.code) && !el.querySelector('[data-action="open-alphabet"]')) {
      var cfg = ALPHA_DATA.get(lang.code), grid = el.querySelector(".grid");
      if (!grid) return;
      var card = '<button data-action="open-alphabet" class="text-left glass-card rounded-3xl p-5 border-0 shadow-lg hover:shadow-xl transition-all"><div class="flex items-center justify-between"><span class="wl-wrap" style="--ig:rgba(139,92,246,.55)">' + windLogo(54) + '</span><span class="rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 text-emerald-950 px-3 py-1 text-[10px] font-black shadow">FREE</span></div><h3 class="text-lg font-black text-teal-600 mt-3">' + (cfg.kind === "radicals" ? "Học 214 bộ thủ" : "Học bảng chữ cái") + '</h3><p class="text-xs text-slate-600 mt-2">' + esc(cfg.title) + ' · 9 cách học: xem thẻ, nghe, viết, flashcard, trắc nghiệm, ghép cặp, gõ, ôn chữ hay sai.</p><p class="text-xs font-bold text-teal-600 mt-4">Vào học →</p></button>';
      var stroke = grid.querySelector(".st-menu-card");
      if (stroke) stroke.insertAdjacentHTML("beforebegin", card); else grid.insertAdjacentHTML("beforeend", card);
    }
  };

  /* ===== Thách đấu bạn bè về bảng chữ cái / bộ thủ (dùng chung hệ thống bạn bè và Premium với thách đấu từ vựng) ===== */
  var alphaDuelTimer = 0;
  function alphaDuelState(A) { if (!A.duel) A.duel = { view: "lobby", sels: [], n: 10, play: null, result: null }; return A.duel; }
  // Đề thi sinh từ hạt giống của lời thách đấu: cùng seed thì cùng đề, không có chữ trùng cách đọc.
  function alphaDuelExam(cfg, seed, n) {
    var rng = mulberry(seed >>> 0), flat = alphaFlat(cfg), idx = flat.map(function (f, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    var seen = {}, qs = [];
    idx.forEach(function (qi) {
      var k = alphaKey(cfg, flat[qi].it);
      if (qs.length >= n || seen[k]) return;
      seen[k] = 1; qs.push(qi);
    });
    return qs.map(function (qi) {
      var used = {}, opts = [qi]; used[alphaKey(cfg, flat[qi].it)] = 1;
      var order = idx.slice();
      for (var a = order.length - 1; a > 0; a--) { var b = Math.floor(rng() * (a + 1)); var tmp = order[a]; order[a] = order[b]; order[b] = tmp; }
      order.forEach(function (oi) { var k = alphaKey(cfg, flat[oi].it); if (opts.length < 4 && !used[k]) { used[k] = 1; opts.push(oi); } });
      for (var c = opts.length - 1; c > 0; c--) { var d = Math.floor(rng() * (c + 1)); var u = opts[c]; opts[c] = opts[d]; opts[d] = u; }
      return { qi: qi, opts: opts, hear: rng() < 0.35 };
    });
  }
  function alphaDuelPoolSize(cfg) { var seen = {}, n = 0; alphaFlat(cfg).forEach(function (f) { var k = alphaKey(cfg, f.it); if (!seen[k]) { seen[k] = 1; n++; } }); return n; }
  function alphaFmtT(ms) { var s = Math.round(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function alphaDuelLobby(cfg, lang, A, D) {
    var wd = window.WINDTP;
    if (!wd) return alphaEmpty("Không kết nối được hệ thống bạn bè.");
    if (!wd.premium()) return '<div class="glass-card rounded-3xl p-6 text-center space-y-3"><div class="text-4xl">👑</div><p class="font-extrabold text-slate-800">Thách đấu bạn bè là tính năng Premium</p><p class="text-xs text-slate-600 leading-relaxed">⚔️ Mời bạn bè online, họ chấp nhận hoặc từ chối<br>📝 Hai người thi cùng một đề<br>🏆 Đúng +100, nhanh tối đa +50, chuỗi đúng +10/câu (tối đa +50)</p><button data-action="open-courses" class="px-4 py-2 rounded-xl bg-amber-500 text-white keep-white text-xs font-bold">Xem các gói khóa học</button></div>';
    var L = wd.ch.listAlpha(lang.code), nm = function (id) { return (wd.friend(id) || { name: "?" }).name; };
    var inc = L.filter(function (c) { return c.dir === "in" && c.status === "pending"; });
    var ready = L.filter(function (c) { return c.status === "accepted" && !c.gid; });
    var wait = L.filter(function (c) { return c.dir === "out" && c.status === "pending" && !c.gid; });
    var gm = {}; L.filter(function (c) { return c.gid && c.dir === "out" && (c.status === "pending" || c.status === "accepted"); }).forEach(function (c) { (gm[c.gid] = gm[c.gid] || []).push(c); });
    var hist = L.filter(function (c) { return ["done", "declined", "expired"].indexOf(c.status) >= 0; }).slice(0, 8);
    var fr = wd.friends().sort(function (a, b) { return Number(b.online) - Number(a.online); });
    D.sels = D.sels.filter(function (id) { return fr.some(function (f) { return f.id === id && f.online; }); });
    var pool = alphaDuelPoolSize(cfg), counts = [10, 15, 20, 30].filter(function (n) { return n <= pool; });
    if (!counts.length) counts = [pool];
    if (counts.indexOf(D.n) < 0) D.n = counts[0];
    var row = function (h) { return '<div class="flex items-center justify-between gap-2 bg-white rounded-2xl border border-slate-200 px-3 py-2 text-xs">' + h + '</div>'; };
    var btn = function (act, label, extra, cls) { return '<button data-action="' + act + '" ' + (extra || "") + ' class="px-3 py-1.5 rounded-xl text-[11px] font-bold ' + (cls || "bg-white border border-slate-200 text-slate-700") + '">' + label + '</button>'; };
    var pri = "bg-sky-600 text-white keep-white";
    var out = "";
    if (inc.length) out += '<p class="text-xs font-extrabold text-slate-700">Lời mời đến</p>' + inc.map(function (c) { return row('<span><b>' + esc(nm(c.fid)) + '</b> thách đấu · ' + c.n + ' câu</span><span class="flex gap-1">' + btn("alpha-d-ac", "Chấp nhận", 'data-id="' + c.id + '"', pri) + btn("alpha-d-dc", "Từ chối", 'data-id="' + c.id + '"') + btn("alpha-d-rm", "🗑", 'data-id="' + c.id + '" aria-label="Xóa thông báo"') + '</span>'); }).join("");
    if (ready.length) out += '<p class="text-xs font-extrabold text-slate-700">Sẵn sàng thi</p>' + ready.map(function (c) { return row('<span>✅ <b>' + esc(nm(c.fid)) + '</b> đã đồng ý · ' + c.n + ' câu</span><span class="flex gap-1">' + btn("alpha-d-pl", "Vào thi", 'data-id="' + c.id + '"', pri) + btn("alpha-d-rm", "🗑", 'data-id="' + c.id + '" aria-label="Xóa thông báo"') + '</span>'); }).join("");
    Object.keys(gm).forEach(function (gid) {
      var list = gm[gid], acc = list.filter(function (c) { return c.status === "accepted"; }).length, pen = list.filter(function (c) { return c.status === "pending"; }).length;
      out += '<p class="text-xs font-extrabold text-slate-700">🏁 Phòng thách đấu nhóm · ' + list[0].n + ' câu</p>' + row('<span>' + list.map(function (c) { return '<div><b>' + esc(nm(c.fid)) + '</b> <small>' + (c.status === "accepted" ? "✅ Đã đồng ý" : "⏳ Đang chờ") + '</small></div>'; }).join("") + '</span>' + btn("alpha-d-gp", pen ? "Vào thi ngay (" + acc + " bạn sẵn sàng)" : "Vào thi (" + acc + " bạn)", 'data-id="' + gid + '"' + (acc ? "" : " disabled"), pri));
    });
    if (wait.length) out += '<p class="text-xs font-extrabold text-slate-700">Đang chờ trả lời</p>' + wait.map(function (c) { return row('<span>⏳ Đang chờ <b>' + esc(nm(c.fid)) + '</b> phản hồi…</span>'); }).join("");
    var nSel = D.sels.length;
    out += '<p class="text-xs font-extrabold text-slate-700">Gửi thách đấu mới</p><div class="flex flex-wrap gap-2">' + counts.map(function (n) { return btn("alpha-d-n", n + " câu", 'data-n="' + n + '"', D.n === n ? pri : ""); }).join("") + '</div>' +
      '<div class="flex items-center justify-between text-[11px] text-slate-600"><span>Chọn bạn đang online · <b>' + nSel + '</b> đã chọn</span><span class="flex gap-1">' + btn("alpha-d-all", "Chọn tất cả online") + btn("alpha-d-none", "Bỏ chọn", nSel ? "" : "disabled") + '</span></div>' +
      fr.map(function (f) { return row('<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + (f.online ? "#22c55e" : "#94a3b8") + '"></i> <b>' + esc(f.name) + '</b> <small class="text-slate-500">' + (f.online ? "Online" : "Offline") + ' · ' + esc(f.rank) + (f.record ? ' · ' + f.record.w + 'T-' + f.record.l + 'B-' + f.record.d + 'H' : "") + '</small></span><span class="flex gap-1">' + btn("alpha-d-poke", "👉 Chọc", 'data-id="' + esc(f.id) + '"') + btn("alpha-d-sel", f.online ? (D.sels.indexOf(f.id) >= 0 ? "✓ Đã chọn" : "Chọn") : "Offline", 'data-id="' + esc(f.id) + '"' + (f.online ? "" : " disabled"), f.online && D.sels.indexOf(f.id) >= 0 ? pri : "") + '</span>'); }).join("") +
      '<button data-action="alpha-d-send" ' + (nSel ? "" : "disabled ") + 'class="w-full py-3 rounded-2xl text-white keep-white font-extrabold bg-gradient-to-r from-rose-600 to-violet-600 disabled:opacity-50">' + (nSel ? "⚔️ Gửi thách đấu (" + nSel + " bạn · " + D.n + " câu)" : "⚔️ Chọn bạn để gửi thách đấu") + '</button>';
    if (hist.length) out += '<p class="text-xs font-extrabold text-slate-700">Gần đây</p>' + hist.map(function (c) {
      if (c.status !== "done") return row('<span>' + (c.status === "declined" ? "🚫 Bị từ chối / đã từ chối" : "⌛ Hết hạn") + ' · <b>' + esc(nm(c.fid)) + '</b></span>');
      var head = c.grp ? "Hạng " + c.grp.rank + "/" + c.grp.size + " · " : (c.my.score > c.their.score ? "✅ Thắng " : c.my.score < c.their.score ? "❌ Thua " : "🤝 Hòa ");
      return row('<span>' + head + '<b>' + esc(nm(c.fid)) + '</b> · ' + c.my.score + ' - ' + c.their.score + '</span>');
    }).join("");
    return '<div class="space-y-2">' + out + '</div>';
  }
  function alphaDuelPlayView(cfg, lang, A, D) {
    var P = D.play, flat = alphaFlat(cfg), q = P.exam[P.i], it = flat[q.qi].it, hear = q.hear && ("speechSynthesis" in window);
    var lim = window.WINDTP.ch.limits.choice;
    var prompt = hear
      ? '<button data-action="alpha-say" data-i="' + q.qi + '" class="px-6 py-4 rounded-2xl bg-sky-600 text-white keep-white text-2xl font-black" aria-label="Nghe lại">🔊</button><p class="text-xs text-slate-500 mt-2">Nghe và chọn chữ đúng</p>'
      : '<div class="text-slate-800 font-black">' + alphaBig(it, 96) + '</div><p class="text-xs text-slate-500 mt-2">Chọn cách đọc đúng</p>';
    var opts = q.opts.map(function (oi) {
      var o = flat[oi].it, st = "border-slate-200 bg-white";
      if (P.picked != null) st = oi === q.qi ? "border-emerald-500 bg-emerald-50" : (oi === P.picked ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white opacity-70");
      return '<button data-action="alpha-d-ans" data-i="' + oi + '"' + (P.picked != null ? " disabled" : "") + ' class="rounded-2xl border p-3 ' + st + ' text-slate-800 ' + (hear ? "font-black" : "text-sm font-bold") + '">' + (hear ? alphaBig(o, 34) : esc(alphaShort(o))) + '</button>';
    }).join("");
    var left = P.picked != null ? 0 : Math.max(0, Math.ceil((P.deadline - Date.now()) / 1000));
    return '<p class="text-xs text-slate-600 text-center">⚔️ vs ' + esc(P.vs) + ' · Câu ' + (P.i + 1) + '/' + P.exam.length + ' · Điểm <b>' + P.score + '</b> · Chuỗi ' + P.streak + ' · ⏱ <b id="alpha-d-time">' + left + '</b>s/' + lim + 's</p>' +
      '<div class="h-2 rounded-full bg-slate-200 overflow-hidden"><div class="h-full bg-sky-500" style="width:' + (P.i / P.exam.length * 100) + '%"></div></div>' +
      '<div class="glass-card rounded-3xl p-6 text-center">' + prompt + '</div><div class="grid grid-cols-2 gap-2">' + opts + '</div>';
  }
  function alphaDuelResultView(D) {
    var r = D.result;
    if (r.board) {
      var med = ["🥇", "🥈", "🥉"], mine = r.board.filter(function (p) { return p.me; })[0];
      return '<div class="glass-card rounded-3xl p-5 text-center space-y-3"><div class="text-5xl">' + (mine.rank <= 3 ? med[mine.rank - 1] : "🏁") + '</div><p class="font-extrabold text-slate-800">' + (mine.rank === 1 ? "Bạn vô địch!" : "Bạn đứng hạng " + mine.rank + "/" + r.size) + '</p><p class="text-[11px] text-slate-500">' + r.size + ' người cùng thi một đề ' + r.n + ' câu · bằng điểm thì ai nhanh hơn xếp trên</p><div class="space-y-1 text-left">' +
        r.board.map(function (p) { return '<div class="flex justify-between text-xs rounded-xl px-3 py-2 ' + (p.me ? "bg-sky-100 font-bold" : "bg-white") + '"><span>' + p.rank + '. ' + (p.me ? "Bạn" : esc(p.name)) + ' <small class="text-slate-500">' + p.correct + '/' + p.total + ' đúng · ' + alphaFmtT(p.ms) + '</small></span><b>' + p.score + 'đ</b></div>'; }).join("") +
        '</div><button data-action="alpha-d-lobby" class="px-4 py-2 rounded-xl bg-sky-600 text-white keep-white text-xs font-bold">Về sảnh thách đấu</button></div>';
    }
    var a = r.my, b = r.their, w = a.score > b.score, d = a.score === b.score, nm = esc((window.WINDTP.friend(r.fid) || { name: "Bạn bè" }).name);
    return '<div class="glass-card rounded-3xl p-5 text-center space-y-3"><div class="text-5xl">' + (w ? "🏆" : d ? "🤝" : "💔") + '</div><p class="font-extrabold text-slate-800">' + (w ? "Bạn thắng!" : d ? "Hòa nhau!" : nm + " thắng") + '</p>' +
      '<div class="flex items-center justify-around"><div><p class="text-xs text-slate-500">Bạn</p><p class="text-3xl font-black text-sky-700">' + a.score + '</p><p class="text-[11px] text-slate-500">' + a.correct + '/' + a.total + ' đúng · ' + alphaFmtT(a.ms) + '</p></div><span class="font-black text-slate-400">VS</span><div><p class="text-xs text-slate-500">' + nm + '</p><p class="text-3xl font-black text-rose-600">' + b.score + '</p><p class="text-[11px] text-slate-500">' + b.correct + '/' + b.total + ' đúng · ' + alphaFmtT(b.ms) + '</p></div></div>' +
      '<p class="text-[11px] text-slate-500">Cả hai thi cùng một đề ' + a.total + ' câu · đúng +100, nhanh tối đa +50, chuỗi đúng +10/câu</p><button data-action="alpha-d-lobby" class="px-4 py-2 rounded-xl bg-sky-600 text-white keep-white text-xs font-bold">Về sảnh thách đấu</button></div>';
  }
  function alphaDuelView(cfg, lang, A) {
    var D = alphaDuelState(A);
    if (D.view === "play" && D.play) return alphaDuelPlayView(cfg, lang, A, D);
    if (D.view === "result" && D.result) return alphaDuelResultView(D);
    D.view = "lobby";
    return alphaDuelLobby(cfg, lang, A, D);
  }
  function alphaDuelStartQ(c) {
    var D = alphaDuelState(c.A), P = D.play;
    P.picked = null; P.deadline = Date.now() + window.WINDTP.ch.limits.choice * 1000; P.qStart = Date.now();
    window.clearInterval(alphaDuelTimer);
    var gen = ++P.gen;
    alphaDuelTimer = window.setInterval(function () {
      if (!ui.alpha || !ui.alpha.duel || ui.alpha.duel.play !== P || P.gen !== gen || P.picked != null) { window.clearInterval(alphaDuelTimer); return; }
      var left = Math.max(0, Math.ceil((P.deadline - Date.now()) / 1000)), el = $("#alpha-d-time");
      if (el) el.textContent = String(left);
      if (Date.now() >= P.deadline) alphaDuelAnswer(c.cfg, null);
    }, 250);
    var q = P.exam[P.i];
    if (q.hear && "speechSynthesis" in window) alphaSpeak(c.cfg, alphaFlat(c.cfg)[q.qi].it.t);
  }
  function alphaDuelBegin(c, exam, vs, finish) {
    var D = alphaDuelState(c.A);
    D.view = "play"; D.play = { exam: exam, i: 0, score: 0, correct: 0, streak: 0, ms: 0, picked: null, vs: vs, finish: finish, gen: 0, deadline: 0 };
    alphaDuelStartQ(c); alphaRerender();
  }
  function alphaDuelAnswer(cfg, pick) {
    var A = alphaState(), D = A.duel, P = D && D.play;
    if (!P || P.picked != null) return;
    var wd = window.WINDTP, q = P.exam[P.i], lim = wd.ch.limits.choice;
    var ok = pick === q.qi, t = pick == null ? lim : Math.min(lim, (Date.now() - P.qStart) / 1000);
    P.picked = pick == null ? -1 : pick;
    window.clearInterval(alphaDuelTimer);
    P.score += wd.ch.scoreQ(ok, t, lim, P.streak); P.streak = ok ? P.streak + 1 : 0; if (ok) P.correct++; P.ms += Math.round(t * 1000);
    alphaRerender();
    var gen = P.gen;
    window.setTimeout(function () {
      if (!ui.alpha || !ui.alpha.duel || ui.alpha.duel.play !== P || P.gen !== gen) return;
      P.i++;
      if (P.i >= P.exam.length) {
        var fin = P.finish, mine = { score: P.score, correct: P.correct, total: P.exam.length, ms: P.ms }, kinds = P.exam.map(function () { return "mc"; });
        D.play = null; D.view = "lobby"; // trước khi ghi kết quả, vì ghi sẽ làm giao diện vẽ lại ngay
        var res = fin(mine, kinds);
        if (res) { D.result = res; D.view = "result"; } else D.view = "lobby";
        alphaRerender();
      } else { var c = alphaCurrent(); if (c) alphaDuelStartQ(c); alphaRerender(); }
    }, 900);
  }

  Object.assign(actions, {
    "alpha-d-lobby": function () { var A = alphaState(), D = alphaDuelState(A); D.view = "lobby"; D.play = null; D.result = null; window.clearInterval(alphaDuelTimer); alphaRerender(); },
    "alpha-d-n": function (el) { var D = alphaDuelState(alphaState()); D.n = Number(el.dataset.n); alphaRerender(); },
    "alpha-d-sel": function (el) { var D = alphaDuelState(alphaState()), id = el.dataset.id; D.sels = D.sels.indexOf(id) >= 0 ? D.sels.filter(function (x) { return x !== id; }) : D.sels.concat([id]); alphaRerender(); },
    "alpha-d-all": function () { var D = alphaDuelState(alphaState()); D.sels = window.WINDTP.friends().filter(function (f) { return f.online; }).map(function (f) { return f.id; }); alphaRerender(); },
    "alpha-d-none": function () { alphaDuelState(alphaState()).sels = []; alphaRerender(); },
    "alpha-d-poke": function (el) { var wd = window.WINDTP; if (wd.poke(el.dataset.id) && wd.pokeFx) wd.pokeFx(el); },
    "alpha-d-send": function () {
      var c = alphaCurrent(); if (!c) return;
      var wd = window.WINDTP, D = alphaDuelState(c.A), lesson = "alpha:" + c.lang.code;
      if (!wd.premium() || !D.sels.length) return;
      var made = D.sels.length === 1 ? [wd.ch.create(D.sels[0], D.n, lesson)].filter(Boolean) : wd.ch.createGroup(D.sels.slice(), D.n, lesson);
      if (made.length) { wd.toast("⚔️ Đã gửi lời thách đấu đến " + made.length + " bạn, chờ phản hồi…"); D.sels = []; alphaRerender(); }
    },
    "alpha-d-ac": function (el) { window.WINDTP.ch.respond(el.dataset.id, true); alphaRerender(); },
    "alpha-d-dc": function (el) { window.WINDTP.ch.respond(el.dataset.id, false); alphaRerender(); },
    "alpha-d-rm": function (el) { window.WINDTP.ch.remove(el.dataset.id); alphaRerender(); },
    "alpha-d-pl": function (el) {
      var c = alphaCurrent(); if (!c) return;
      var wd = window.WINDTP, ch = wd.ch.get(el.dataset.id);
      if (!ch || ch.status !== "accepted" || ch.lesson !== "alpha:" + c.lang.code) { alphaRerender(); return; }
      var id = ch.id;
      alphaDuelBegin(c, alphaDuelExam(c.cfg, ch.seed, ch.n), (wd.friend(ch.fid) || { name: "Bạn bè" }).name, function (my, kinds) { var done = wd.ch.finish(id, my, kinds); return done ? { fid: done.fid, my: done.my, their: done.their } : null; });
    },
    "alpha-d-gp": function (el) {
      var c = alphaCurrent(); if (!c) return;
      var wd = window.WINDTP, gid = el.dataset.id, mem = wd.ch.listAlpha(c.lang.code).filter(function (x) { return x.gid === gid && x.status === "accepted"; });
      if (!mem.length) { alphaRerender(); return; }
      var names = mem.map(function (x) { return (wd.friend(x.fid) || { name: "?" }).name; }).join(", ");
      alphaDuelBegin(c, alphaDuelExam(c.cfg, mem[0].seed, mem[0].n), mem.length + " bạn (" + names + ")", function (my, kinds) { return wd.ch.finishGroup(gid, my, kinds); });
    },
    "alpha-d-ans": function (el) { var c = alphaCurrent(); if (c) alphaDuelAnswer(c.cfg, Number(el.dataset.i)); }
  });
