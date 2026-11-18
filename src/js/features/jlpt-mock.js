  /* ===== Đề thi tiếng Nhật: JLPT N5–N1, JFT-Basic, EJU — Luyện tập / Thi thử =====
     • Luyện tập: không tính giờ, chọn xong thấy đúng/sai và giải thích ngay, có thể luyện từng phần.
     • Thi thử: thời gian từng phần đúng như kỳ thi thật (JLPT: jlpt.jp), hết giờ phần nào thì tự chuyển phần, không quay lại phần cũ.
     • Sau khi nộp: xem điểm ước tính + xem lại toàn bộ đáp án và giải thích.
     Câu hỏi do WINDTP tự soạn từ kho từ vựng Mimikara Nomi / ngữ pháp trong app (không sao chép đề thật), nên điểm chỉ để tự đánh giá. */
  var JM_PART = { kanji: "文字", mean: "語彙", ctx: "文脈", gram: "文法", read: "読解", listen: "聴解", conv: "会話・表現" };
  var JM_G3 = [
    { n: "言語知識 (文字・語彙・文法)", max: 60, min: 19, t: ["kanji", "mean", "ctx", "gram"] },
    { n: "読解 (Đọc hiểu)", max: 60, min: 19, t: ["read"] },
    { n: "聴解 (Nghe)", max: 60, min: 19, t: ["listen"] }
  ];
  var JM_G2 = [
    { n: "言語知識・読解", max: 120, min: 38, t: ["kanji", "mean", "ctx", "gram", "read"] },
    { n: "聴解 (Nghe)", max: 60, min: 19, t: ["listen"] }
  ];
  var JM_EX = [
    { id: "n5", name: "JLPT N5", lv: [0], pass: 80, groups: JM_G2, secs: [
      { n: "文字・語彙", min: 20, p: [["kanji", 8], ["mean", 8], ["ctx", 9]] },
      { n: "文法・読解", min: 40, p: [["gram", 16], ["read", 10]] },
      { n: "聴解", min: 30, p: [["listen", 20]] }] },
    { id: "n4", name: "JLPT N4", lv: [1], pass: 90, groups: JM_G2, secs: [
      { n: "文字・語彙", min: 25, p: [["kanji", 10], ["mean", 8], ["ctx", 10]] },
      { n: "文法・読解", min: 55, p: [["gram", 20], ["read", 12]] },
      { n: "聴解", min: 35, p: [["listen", 24]] }] },
    { id: "n3", name: "JLPT N3", lv: [2], pass: 95, groups: JM_G3, secs: [
      { n: "文字・語彙", min: 30, p: [["kanji", 10], ["mean", 10], ["ctx", 10]] },
      { n: "文法・読解", min: 70, p: [["gram", 22], ["read", 14]] },
      { n: "聴解", min: 40, p: [["listen", 24]] }] },
    { id: "n2", name: "JLPT N2", lv: [3], pass: 90, groups: JM_G3, secs: [
      { n: "言語知識（文字・語彙・文法）・読解", min: 105, p: [["kanji", 8], ["mean", 8], ["ctx", 10], ["gram", 24], ["read", 20]] },
      { n: "聴解", min: 50, p: [["listen", 28]] }] },
    { id: "n1", name: "JLPT N1", lv: [4], pass: 100, groups: JM_G3, secs: [
      { n: "言語知識（文字・語彙・文法）・読解", min: 110, p: [["kanji", 8], ["mean", 8], ["ctx", 10], ["gram", 26], ["read", 22]] },
      { n: "聴解", min: 55, p: [["listen", 30]] }] },
    { id: "jft", name: "JFT-Basic (Nhật Bản Foundation)", lv: [0, 1], jft: true, secs: [
      { n: "Toàn bài (4 phần, không chia giờ)", min: 60, p: [["kanji", 6], ["mean", 6], ["conv", 13], ["listen", 12], ["read", 13]] }] },
    { id: "eju", name: "EJU – Tiếng Nhật (thi du học)", lv: [3, 4], eju: true, secs: [
      { n: "Đọc – Nghe hiểu (phần trắc nghiệm)", min: 125, p: [["ctx", 10], ["gram", 10], ["read", 25], ["listen", 20]] }] }
  ];
  var jm = null, jmTimer = 0;
  function jmTotalMin(e) { return e.secs.reduce(function (a, s) { return a + s.min; }, 0); }
  function jmCount(s) { return s.p.reduce(function (a, x) { return a + x[1]; }, 0); }
  function jmEx(id) { return JM_EX.filter(function (e) { return e.id === id; })[0]; }
  function jmHist() { try { return JSON.parse(localStorage.getItem("wd_jlpt") || "[]") || []; } catch (e) { return []; } }
  function jmHistSave(r) { try { var a = jmHist(); a.unshift(r); localStorage.setItem("wd_jlpt", JSON.stringify(a.slice(0, 30))); } catch (e) {} }
  function jmOpts(right, pool, key) {
    var others = [], seen = {}; seen[right] = 1;
    shuffle(pool.slice()).forEach(function (x) { var v = key(x); if (v && !seen[v] && others.length < 3) { seen[v] = 1; others.push(v); } });
    if (others.length < 3) return null;
    var options = shuffle([right].concat(others));
    return { options: options, answer: options.indexOf(right) };
  }
  function jmLoad(lvs, key) {
    var voc = window.WindtpData && window.WindtpData.vocabSync("ja"), out = [];
    lvs.forEach(function (lv) { ((voc && voc[key + "|" + lv]) || []).forEach(function (L) { (L[1] || []).forEach(function (w) { if (w && w[0]) out.push(w); }); }); });
    return out;
  }
  function jmBlank(w) {
    var s = w[4] || "", cands = [w[0], w[1]].map(function (t) { return String(t || "").replace(/[（(][^）)]*[）)]/g, "").replace(/[～〜~\s]/g, ""); }).filter(Boolean);
    for (var i = 0; i < cands.length; i++) { var k = s.indexOf(cands[i]); if (k >= 0 && cands[i].length >= 2) return s.slice(0, k) + "＿＿＿" + s.slice(k + cands[i].length); }
    return null;
  }
  var jmWordExp = function (w) { return w[0] + (w[1] && w[1] !== w[0] ? "（" + w[1] + "）" : "") + " = " + w[3]; };
  /* Tạo câu hỏi cho một phần thi; used: các từ/mẫu đã dùng trong cả đề để không lặp. */
  function jmSection(e, sdef, W, G, used) {
    var out = [], S = W.filter(function (w) { return w[4] && w[5]; });
    var take = function (pool, n, pred, k) {
      var r = [], p = shuffle(pool.slice());
      for (var i = 0; i < p.length && r.length < n; i++) { var id = k + "|" + p[i][0]; if (used[id] || (pred && !pred(p[i]))) continue; used[id] = 1; r.push(p[i]); }
      return r;
    };
    sdef.p.forEach(function (pp) {
      var t = pp[0], n = pp[1], part = JM_PART[t];
      if (t === "kanji") take(W.filter(function (w) { return w[1] && /[㐀-鿿]/.test(w[0]) && w[0] !== w[1]; }), n, null, "w").forEach(function (w) {
        var o = jmOpts(w[1], W.filter(function (x) { return x[1]; }), function (x) { return x[1]; });
        if (o) out.push({ t: t, part: part, prompt: w[0], sub: "Chọn cách đọc đúng", options: o.options, answer: o.answer, exp: jmWordExp(w) });
      });
      else if (t === "mean") take(W.filter(function (w) { return w[3]; }), n, null, "w").forEach(function (w) {
        var o = jmOpts(w[3], W.filter(function (x) { return x[3]; }), function (x) { return x[3]; });
        if (o) out.push({ t: t, part: part, prompt: w[0] + (w[1] && w[1] !== w[0] ? "（" + w[1] + "）" : ""), sub: "Chọn nghĩa đúng", options: o.options, answer: o.answer, exp: jmWordExp(w) });
      });
      else if (t === "ctx" || t === "conv") take(W.filter(function (w) { return w[5] && jmBlank(w); }), n, null, "w").forEach(function (w) {
        var o = jmOpts(w[0], W, function (x) { return x[0]; });
        if (o) out.push({ t: t, part: part, prompt: jmBlank(w), sub: "Chọn từ/cách nói điền vào chỗ trống", options: o.options, answer: o.answer, exp: w[4] + " — " + w[5] + "  |  " + jmWordExp(w) });
      });
      else if (t === "gram") take(G.filter(function (g) { return g[4]; }), n, null, "g").forEach(function (g) {
        var o = jmOpts(g[0], G, function (x) { return x[0]; });
        if (o) out.push({ t: t, part: part, prompt: g[4], sub: "Câu này dùng mẫu ngữ pháp nào?", options: o.options, answer: o.answer, exp: g[0] + ": " + g[1] + (g[3] ? ". " + g[3] : "") + "  |  " + g[4] + " — " + (g[5] || "") });
      });
      else if (t === "read") take(S, n, null, "s").forEach(function (w) {
        var o = jmOpts(w[5], S, function (x) { return x[5]; });
        if (o) out.push({ t: t, part: part, prompt: w[4], sub: "Đọc câu và chọn bản dịch đúng", options: o.options, answer: o.answer, exp: "Từ khóa: " + jmWordExp(w) });
      });
      else if (t === "listen") take(S, n, null, "s").forEach(function (w) {
        var o = jmOpts(w[5], S, function (x) { return x[5]; });
        if (o) out.push({ t: t, part: part, prompt: "🎧", sub: "Nghe và chọn ý nghĩa đúng", speak: w[4].replace(/[（(][^）)]*[）)]/g, ""), options: o.options, answer: o.answer, exp: "Nội dung: " + w[4] + " — " + w[5] });
      });
    });
    return out;
  }
  function jmBuild(e, only) {
    var W = jmLoad(e.lv, "Mimikara Nomi"), G = jmLoad(e.lv, "Cấu trúc ngữ pháp"), used = {}, qs = [], secs = [];
    if (W.length < 60 || G.length < 20) return null;
    e.secs.forEach(function (sd, si) {
      if (only != null && only !== si) return;
      var from = qs.length, part = jmSection(e, sd, W, G, used);
      part.forEach(function (q) { q.si = secs.length; qs.push(q); });
      secs.push({ def: sd, from: from, to: qs.length - 1 });
    });
    return qs.length >= 10 ? { qs: qs, secs: secs } : null;
  }

  /* ---- Đề thi thật (tách từ PDF đề JLPT; chỉ phần chữ: 文字・語彙 / 文法 / 読解, chưa có phần nghe) ---- */
  var JM_REAL_SECS = ["文字・語彙", "文法", "読解"], jmRealCache = {};
  var JM_REAL_G = [{ n: "言語知識 (文字・語彙・文法)", max: 60, min: 19, t: ["lang"] }, { n: "読解 (Đọc hiểu)", max: 60, min: 19, t: ["read"] }];
  function jmExamUrl(name) {
    try { var m = JSON.parse(document.getElementById("windtp-data-manifest").textContent); return m.exams && m.exams[name] || null; } catch (e) { return null; }
  }
  function jmRealLoad(name) {
    if (jmRealCache[name]) return Promise.resolve(jmRealCache[name]);
    var u = jmExamUrl(name); if (!u) return Promise.reject(new Error("no-url"));
    return fetch(new URL(u, document.baseURI).href, { credentials: "same-origin" }).then(function (r) { if (!r.ok) throw new Error("http"); return r.json(); }).then(function (d) { jmRealCache[name] = d; return d; });
  }
  function jmRealEx(lvl, en) {
    return { id: en.id, name: "JLPT " + lvl + " · đề thật " + en.period, real: true, groups: JM_REAL_G, secs: [{ n: "言語知識（文字・語彙・文法）・読解", min: lvl === "N1" ? 110 : 105, p: [] }] };
  }
  function jmRealQs(en, only) {
    var out = [];
    en.questions.forEach(function (q) {
      if (only != null && q.s !== JM_REAL_SECS[only]) return;
      var m = /問題\s*(\d+)/.exec(q.i || "");
      out.push({ t: q.s === "読解" ? "read" : "lang", part: q.s + (m ? " · 問題" + m[1] : ""), prompt: q.q || "（" + q.n + "）", sub: (q.i || "").replace(/^問題\s*\d+\s*/, "").slice(0, 70), ctx: q.p != null ? en.passages[q.p] : "", options: q.o, answer: q.a - 1, exp: "Câu " + q.n + " · đáp án đúng: " + q.o[q.a - 1] });
    });
    return out;
  }
  function jmRealList() {
    jmRealLoad("jlpt-n2").then(function (d) {
      var rows = d.exams.map(function (en) { return '<button data-action="jlpt-real-exam" data-id="' + en.id + '" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">' + en.period + '<span class="block text-[10px] font-normal">' + en.questions.length + ' câu</span></button>'; }).join("");
      openModal(function () { return modalHead("📚 JLPT N2 · Đề thật") + '<div class="p-5 space-y-3"><p class="text-xs text-slate-600">Đề các kỳ thi N2 từ 2010 đến nay (phần chữ: từ vựng, ngữ pháp, đọc hiểu; phần nghe chưa có). Mỗi đề có Luyện tập và Thi thử tính giờ ' + 105 + ' phút. Đề nào có hình/bảng mà bản chữ không đọc được thì đã được lược bỏ.</p><div class="grid grid-cols-3 gap-2">' + rows + '</div><button data-action="jlpt-menu" class="w-full text-xs text-slate-500 underline">← Danh sách đề</button></div>'; });
    }, function () { toast("Không tải được đề thật, hãy kiểm tra mạng rồi thử lại"); });
  }
  function jmRealDetail(en) {
    var e = jmRealEx("N2", en), n = en.questions.length;
    var cnt = {}; en.questions.forEach(function (q) { cnt[q.s] = (cnt[q.s] || 0) + 1; });
    var secBtns = JM_REAL_SECS.map(function (s, i) { return cnt[s] ? '<button data-action="jlpt-real-go" data-id="' + en.id + '" data-mode="practice" data-s="' + i + '" class="w-full ' + btnGhost + '">📖 ' + s + ' (' + cnt[s] + ' câu)</button>' : ""; }).join("");
    return modalHead(esc(e.name)) + '<div class="p-5 space-y-3"><p class="text-xs text-slate-600">' + n + ' câu · thời gian thi thử ' + e.secs[0].min + ' phút (phần chữ). Điểm hiển thị là tỉ lệ đúng và điểm quy đổi ước tính từng phần (chưa gồm phần nghe).</p>' +
      '<button data-action="jlpt-real-go" data-id="' + en.id + '" data-mode="mock" class="w-full ' + btnPrimary + '">⏱ Thi thử · ' + e.secs[0].min + ' phút</button>' +
      '<button data-action="jlpt-real-go" data-id="' + en.id + '" data-mode="practice" class="w-full ' + btnGhost + '">📖 Luyện tập cả đề · không tính giờ</button>' + secBtns +
      '<button data-action="jlpt-real" class="w-full text-xs text-slate-500 underline">← Danh sách đề thật</button></div>';
  }
  function jmRealStart(id, mode, only) {
    var go = function () {
      jmRealLoad("jlpt-n2").then(function (d) {
        var en = d.exams.filter(function (x) { return x.id === id; })[0]; if (!en) return;
        var qs = jmRealQs(en, only); if (qs.length < 3) { toast("Đề này chưa có câu để làm"); return; }
        var e = jmRealEx("N2", en); qs.forEach(function (q) { q.si = 0; });
        jmStop(); jm = { ex: e, mode: mode, qs: qs, secs: [{ def: e.secs[0], from: 0, to: qs.length - 1 }], idx: 0, si: 0, ans: [], plays: {}, done: false, wait: mode === "mock", view: "", end: 0 };
        openModal(jmRender);
      }, function () { toast("Không tải được đề thật, hãy kiểm tra mạng rồi thử lại"); });
    };
    if (!hasCourse("ja")) { lockWith("ja"); return; }
    go();
  }
  function jmFmt(s) { s = Math.max(0, s); var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ":" + ("0" + m).slice(-2) : m) + ":" + ("0" + (s % 60)).slice(-2); }
  function jmCard(e) {
    var n = e.secs.reduce(function (a, s) { return a + jmCount(s); }, 0);
    return '<button data-action="jlpt-exam" data-id="' + e.id + '" class="w-full text-left rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 p-3.5"><span class="font-extrabold text-rose-800">' + esc(e.name) + '</span><span class="block text-xs text-rose-700">' + jmTotalMin(e) + ' phút · ' + e.secs.length + ' phần · ' + n + ' câu' + (e.pass ? " · đạt từ " + e.pass + "/180" : "") + '</span></button>';
  }
  function jmMenu() {
    var h = jmHist();
    var hist = h.length ? '<div><p class="text-xs font-bold text-slate-700 mb-1">Lịch sử thi thử gần đây</p><ul class="text-xs text-slate-600 space-y-0.5">' + h.slice(0, 8).map(function (r) {
      return '<li>' + esc(r.date) + ' · ' + esc(r.name || r.lv) + ' · <b>' + esc(String(r.show || (r.total + "/180"))) + '</b> · ' + (r.pass ? "✅" : "❌") + '</li>'; }).join("") + '</ul></div>' : "";
    return modalHead("🎌 Đề thi tiếng Nhật") + '<div class="p-5 space-y-3"><p class="text-xs text-slate-600">Mỗi đề có 2 chế độ: <b>Luyện tập</b> (không tính giờ, có đáp án ngay) và <b>Thi thử</b> (tính giờ từng phần như thi thật). Sau khi nộp bài bạn xem lại được toàn bộ đáp án.</p>' + JM_EX.map(jmCard).join("") + '<button data-action="jlpt-real" class="w-full text-left rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 p-3.5"><span class="font-extrabold text-amber-800">📚 JLPT N2 · Đề thật 2010–nay</span><span class="block text-xs text-amber-700">24 đề thi thật, có đáp án · Luyện tập &amp; Thi thử</span></button>' + hist + '</div>';
  }
  function jmDetail(e) {
    var rows = e.secs.map(function (s, i) { return '<li class="flex justify-between gap-2"><span>' + esc(s.n) + '</span><b class="whitespace-nowrap">' + s.min + ' phút · ' + jmCount(s) + ' câu</b></li>'; }).join("");
    var sec = e.secs.length > 1 ? '<p class="text-xs font-bold text-slate-700 pt-1">Luyện theo từng phần</p>' + e.secs.map(function (s, i) { return '<button data-action="jlpt-go" data-id="' + e.id + '" data-mode="practice" data-s="' + i + '" class="w-full ' + btnGhost + '">📖 ' + esc(s.n) + '</button>'; }).join("") : "";
    var note = e.pass ? 'Điểm quy đổi thang 180; đạt khi tổng ≥ ' + e.pass + ' và từng phần ≥ mức tối thiểu.' : e.jft ? 'JFT-Basic thang 10–250, không có điểm đậu/rớt; mốc A1 ≥145, A2.1 ≥175, A2.2 ≥200. Điểm ở đây chỉ là ước tính.' : 'EJU: hiển thị tỉ lệ đúng; phần viết (記述) không có trong bản trắc nghiệm này.';
    return modalHead(esc(e.name)) + '<div class="p-5 space-y-3"><ul class="text-xs text-slate-700 space-y-1.5">' + rows + '</ul><p class="text-xs text-slate-500">' + note + ' Thời gian từng phần theo quy định kỳ thi thật; nghe chỉ được phát tối đa 2 lần/câu ở chế độ thi thử.</p>' +
      '<button data-action="jlpt-go" data-id="' + e.id + '" data-mode="mock" class="w-full ' + btnPrimary + '">⏱ Thi thử · tính giờ (' + jmTotalMin(e) + ' phút)</button>' +
      '<button data-action="jlpt-go" data-id="' + e.id + '" data-mode="practice" class="w-full ' + btnGhost + '">📖 Luyện tập cả đề · không tính giờ</button>' + sec +
      '<button data-action="jlpt-menu" class="w-full text-xs text-slate-500 underline">← Danh sách đề</button></div>';
  }
  function jmCurSec() { return jm.secs[jm.mode === "mock" ? jm.si : 0]; }
  function jmRender() {
    if (!jm) return "";
    if (jm.view === "review") return jmReview();
    if (jm.done) return jmResult();
    if (jm.wait) {
      var ns = jm.secs[jm.si];
      return modalHead(esc(jm.ex.name)) + '<div class="p-5 space-y-3 text-center"><p class="text-4xl">📝</p><p class="font-extrabold text-slate-800">' + (jm.si ? "Đã nộp phần trước." : "Sẵn sàng thi thử") + '</p><p class="text-sm text-slate-600">Phần tiếp theo: <b>' + esc(ns.def.n) + '</b><br>' + ns.def.min + ' phút · ' + (ns.to - ns.from + 1) + ' câu. Đồng hồ chạy khi bạn bấm bắt đầu; không thể quay lại phần đã nộp.</p><button data-action="jlpt-begin" class="w-full ' + btnPrimary + '">Bắt đầu phần này</button></div>';
    }
    var q = jm.qs[jm.idx], a = jm.ans[jm.idx], mock = jm.mode === "mock", sec = mock ? jm.secs[jm.si] : { from: 0, to: jm.qs.length - 1 };
    var locked = !mock && a != null;
    var opts = q.options.map(function (o, i) {
      var cls = "border-slate-200 bg-white";
      if (locked) cls = i === q.answer ? "border-emerald-500 bg-emerald-50 font-bold" : a === i ? "border-rose-500 bg-rose-50" : "border-slate-200 bg-white opacity-70";
      else if (a === i) cls = "border-rose-500 bg-rose-50 font-bold";
      return '<button data-action="jlpt-pick" data-i="' + i + '" class="w-full text-left rounded-xl border px-3 py-2.5 text-sm ' + cls + '">' + esc(o) + '</button>';
    }).join("");
    var plays = (jm.plays[jm.idx] || 0);
    var head = q.speak ? '<button data-action="jlpt-say" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-sm">🔊 ' + (mock ? "Nghe (" + Math.max(0, 2 - plays) + " lần còn lại)" : "Nghe lại") + '</button>' : '<p class="text-xl font-bold text-slate-800 leading-relaxed">' + esc(q.prompt) + '</p>';
    var answered = jm.ans.filter(function (x) { return x != null; }).length;
    var info = locked ? '<div class="rounded-xl p-3 text-xs ' + (a === q.answer ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900") + '"><b>' + (a === q.answer ? "✅ Chính xác!" : "❌ Chưa đúng") + '</b><br>' + esc(q.exp || "") + '</div>' : "";
    var last = jm.idx === sec.to;
    var nav = '<div class="flex gap-2 pt-1"><button data-action="jlpt-nav" data-d="-1" class="flex-1 ' + btnGhost + '"' + (jm.idx > sec.from ? "" : " disabled") + '>← Trước</button>' +
      (last ? '<button data-action="jlpt-submit" class="flex-1 ' + btnPrimary + '">' + (mock && jm.si < jm.secs.length - 1 ? "Nộp phần này" : "Nộp bài") + '</button>' : '<button data-action="jlpt-nav" data-d="1" class="flex-1 ' + btnPrimary + '">Sau →</button>') + '</div>';
    var timer = mock ? '<b id="jm-timer" class="text-rose-600">⏱ ' + jmFmt(Math.ceil((jm.end - Date.now()) / 1000)) + '</b>' : '<b class="text-emerald-600">📖 Luyện tập</b>';
    var map = '<div class="flex flex-wrap gap-1">' + jm.qs.map(function (x, i) { return i < sec.from || i > sec.to ? "" : '<button data-action="jlpt-go-q" data-i="' + i + '" class="w-6 h-6 rounded text-[10px] font-bold ' + (i === jm.idx ? "bg-rose-600 text-white" : jm.ans[i] != null ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500") + '">' + (i + 1) + '</button>'; }).join("") + '</div>';
    return modalHead(esc(jm.ex.name) + " · " + esc(q.part)) + '<div class="p-5 space-y-3">' +
      '<div class="flex justify-between text-xs text-slate-500"><span>Câu ' + (jm.idx + 1) + '/' + jm.qs.length + ' · đã làm ' + answered + '</span>' + timer + '</div>' +
      '<p class="text-xs text-slate-500">' + esc(q.sub) + '</p>' + (q.ctx ? '<div class="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">' + esc(q.ctx) + '</div>' : "") + head + '<div class="space-y-2">' + opts + '</div>' + info + nav +
      (mock || jm.qs.length > 30 ? map : "") + (last ? "" : '<button data-action="jlpt-submit" class="w-full text-xs text-slate-500 underline">' + (mock && jm.si < jm.secs.length - 1 ? "Nộp phần này sớm" : "Nộp bài sớm") + '</button>') + '</div>';
  }
  function jmScore() {
    var e = jm.ex, groups = e.groups || [{ n: "Tổng", max: 100, min: 0, t: ["kanji", "mean", "ctx", "gram", "read", "listen", "conv"] }];
    var gs = groups.map(function (g) {
      var tot = 0, ok = 0;
      jm.qs.forEach(function (q, i) { if (g.t.indexOf(q.t) >= 0) { tot++; if (jm.ans[i] === q.answer) ok++; } });
      return { n: g.n, max: g.max, min: g.min, ok: ok, tot: tot, sc: tot ? Math.round(g.max * ok / tot) : 0 };
    });
    var allTot = gs.reduce(function (a, g) { return a + g.tot; }, 0), allOk = gs.reduce(function (a, g) { return a + g.ok; }, 0);
    var r = { gs: gs, ok: allOk, tot: allTot, total: gs.reduce(function (a, g) { return a + g.sc; }, 0) };
    var parts = {}; jm.qs.forEach(function (q, i) { var p = parts[q.part] || (parts[q.part] = [0, 0]); p[1]++; if (jm.ans[i] === q.answer) p[0]++; }); r.parts = parts;
    if (e.pass) { r.pass = r.total >= e.pass && gs.every(function (g) { return !g.tot || g.sc >= g.min; }); r.show = r.total + "/180"; }
    else if (e.real) { r.total = Math.round(100 * (allTot ? allOk / allTot : 0)); r.show = r.total + "%"; r.pass = r.total >= 60; }
    else if (e.jft) { r.total = Math.round(10 + 240 * (allTot ? allOk / allTot : 0)); r.show = r.total + "/250"; r.pass = r.total >= 145; r.level = r.total >= 200 ? "A2.2" : r.total >= 175 ? "A2.1" : r.total >= 145 ? "A1" : "chưa đạt A1"; }
    else { r.total = Math.round(100 * (allTot ? allOk / allTot : 0)); r.show = r.total + "%"; r.pass = r.total >= 60; }
    return r;
  }
  function jmResult() {
    var r = jm.result, e = jm.ex, wrong = jm.qs.length - r.ok;
    if (e.real) { var bigR = r.total + '<span class="text-base">%</span>'; }
    var big = e.real ? bigR : e.pass ? r.total + '<span class="text-base">/180</span>' : e.jft ? r.total + '<span class="text-base">/250</span>' : r.total + '<span class="text-base">%</span>';
    var verdict = e.real ? (r.pass ? "✅ Khá tốt (≥ 60% câu đúng)" : "Cần luyện thêm") : e.pass ? (r.pass ? "✅ Đạt (ước tính)" : "❌ Chưa đạt (ước tính)") : e.jft ? "Mức ước tính: " + r.level : (r.pass ? "✅ Khá tốt" : "Cần luyện thêm");
    var sub = e.real ? "Điểm quy đổi ước tính từng phần bên dưới; chưa gồm phần nghe nên chưa thể kết luận đạt/rớt JLPT" : e.pass ? 'Đạt ' + esc(e.name) + ': ≥ ' + e.pass + '/180 và mỗi phần ≥ mức tối thiểu' : e.jft ? "Thang ước tính từ tỉ lệ đúng; điểm chính thức được quy đổi (equating) nên có thể lệch" : "Tỉ lệ câu đúng trên phần trắc nghiệm";
    var rows = r.gs.map(function (g) { return (e.pass || e.real) ? '<div class="flex justify-between text-sm"><span>' + esc(g.n) + '</span><b class="' + (g.sc < g.min ? "text-rose-600" : "text-emerald-600") + '">' + g.sc + '/' + g.max + ' <span class="text-xs font-normal">(' + g.ok + '/' + g.tot + ' câu · tối thiểu ' + g.min + ')</span></b></div>' : ""; }).join("");
    var pr = Object.keys(r.parts).map(function (k) { return '<span class="inline-block text-xs rounded-lg bg-slate-100 px-2 py-1 mr-1 mb-1">' + esc(k) + ' <b>' + r.parts[k][0] + '/' + r.parts[k][1] + '</b></span>'; }).join("");
    return modalHead("🎌 Kết quả · " + esc(e.name)) + '<div class="p-5 space-y-3">' +
      '<div class="rounded-2xl p-4 text-center ' + (r.pass ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200") + '"><p class="text-3xl font-extrabold">' + big + '</p><p class="font-bold">' + verdict + '</p><p class="text-xs text-slate-600 mt-1">' + sub + '</p><p class="text-xs text-slate-500 mt-1">' + (jm.mode === "mock" ? "⏱ Thi thử" : "📖 Luyện tập") + ' · đúng ' + r.ok + '/' + r.tot + ' câu</p></div>' +
      (rows ? '<div class="space-y-1">' + rows + '</div>' : "") + '<div>' + pr + '</div>' +
      '<button data-action="jlpt-review" data-f="all" class="w-full ' + btnPrimary + '">🔍 Xem lại đáp án (' + jm.qs.length + ' câu)</button>' +
      (wrong ? '<button data-action="jlpt-review" data-f="wrong" class="w-full ' + btnGhost + '">Chỉ xem câu sai / bỏ trống (' + wrong + ')</button>' : '<p class="text-sm font-bold text-emerald-600 text-center">Hoàn hảo, không sai câu nào! 🎉</p>') +
      '<div class="flex gap-2"><button data-action="' + (e.real ? "jlpt-real-exam" : "jlpt-exam") + '" data-id="' + e.id + '" class="flex-1 ' + btnGhost + '">Làm lại / đổi chế độ</button><button data-action="jlpt-menu" class="flex-1 ' + btnGhost + '">Danh sách đề</button></div></div>';
  }
  function jmReview() {
    var f = jm.rf || "all", items = [];
    jm.qs.forEach(function (q, i) { if (f === "all" || jm.ans[i] !== q.answer) items.push(i); });
    var list = items.map(function (i) {
      var q = jm.qs[i], a = jm.ans[i], good = a === q.answer;
      var opts = q.options.map(function (o, k) {
        var c = k === q.answer ? "bg-emerald-50 border-emerald-500 font-bold" : k === a ? "bg-rose-50 border-rose-500 line-through" : "border-slate-200";
        return '<div class="rounded-lg border px-2.5 py-1.5 text-xs ' + c + '">' + (k === q.answer ? "✅ " : k === a ? "❌ " : "") + esc(o) + '</div>';
      }).join("");
      return '<div class="rounded-2xl border border-slate-200 p-3 space-y-1.5"><p class="text-[11px] text-slate-500">Câu ' + (i + 1) + ' · ' + esc(q.part) + ' · ' + (a == null ? "bỏ trống" : good ? "đúng" : "sai") + '</p>' +
        (q.ctx ? '<details class="text-xs text-slate-500"><summary>Xem đoạn văn</summary><div class="whitespace-pre-wrap mt-1">' + esc(q.ctx) + '</div></details>' : "") + (q.speak ? '<button data-action="jlpt-rsay" data-i="' + i + '" class="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold">🔊 Nghe</button>' : '<p class="font-bold text-slate-800">' + esc(q.prompt) + '</p>') +
        '<div class="space-y-1">' + opts + '</div><p class="text-xs text-slate-600">💡 ' + esc(q.exp || "") + '</p></div>';
    }).join("");
    return modalHead("🔍 Đáp án · " + esc(jm.ex.name)) + '<div class="p-5 space-y-3"><div class="flex gap-2"><button data-action="jlpt-review" data-f="all" class="flex-1 ' + (f === "all" ? btnPrimary : btnGhost) + '">Tất cả</button><button data-action="jlpt-review" data-f="wrong" class="flex-1 ' + (f === "wrong" ? btnPrimary : btnGhost) + '">Sai / trống</button></div>' +
      (list || '<p class="text-sm text-emerald-600 font-bold text-center">Không có câu nào sai 🎉</p>') + '<button data-action="jlpt-back" class="w-full ' + btnGhost + '">← Về kết quả</button></div>';
  }
  function jmStop() { if (jmTimer) { clearInterval(jmTimer); jmTimer = 0; } }
  function jmFinish() {
    if (!jm || jm.done) return;
    jmStop(); jm.result = jmScore(); jm.done = true; jm.view = "";
    if (jm.mode === "mock") { var d = new Date(); jmHistSave({ id: jm.ex.id, name: jm.ex.name, date: d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear(), total: jm.result.total, show: jm.result.show, pass: jm.result.pass }); }
    openModal(jmRender);
  }
  function jmNextSec(auto) {
    if (jm.si >= jm.secs.length - 1) return jmFinish();
    jm.si++; jm.wait = true; jmStop();
    if (auto) toast("Hết giờ phần này, chuyển sang phần tiếp theo.");
    openModal(jmRender);
  }
  function jmTick() {
    if (!jm || jm.done || jm.wait || jm.mode !== "mock" || ui.renderModal !== jmRender) { jmStop(); return; }
    var left = Math.ceil((jm.end - Date.now()) / 1000), el = document.getElementById("jm-timer");
    if (el) el.textContent = "⏱ " + jmFmt(left);
    if (left <= 0) jmNextSec(true);
  }
  function jmSay(forReview) {
    var q = jm && jm.qs[forReview != null ? forReview : jm.idx]; if (!q || !q.speak) return;
    if (forReview == null && jm.mode === "mock") { var p = jm.plays[jm.idx] || 0; if (p >= 2) { toast("Đã hết lượt nghe của câu này"); return; } jm.plays[jm.idx] = p + 1; }
    speak(q.speak, "ja-JP");
    if (forReview == null && jm.mode === "mock") openModal(jmRender);
  }
  function jmStart(id, mode, only) {
    var e = jmEx(id); if (!e) return;
    var ready = async function () {
      if (!(e.id === "n5") && !hasCourse("ja")) { lockWith("ja"); return; }
      if (!(e.id === "n5") && typeof econEnsureFullVocab === "function" && !(await econEnsureFullVocab("ja"))) return;
      var b = jmBuild(e, only);
      if (!b) { toast("Chưa đủ dữ liệu để tạo đề này, hãy thử lại sau"); return; }
      jmStop();
      jm = { ex: e, mode: mode, qs: b.qs, secs: b.secs, idx: 0, si: 0, ans: [], plays: {}, done: false, wait: mode === "mock", view: "", end: 0 };
      if (mode === "mock") { jm.end = 0; openModal(jmRender); } else { openModal(jmRender); setTimeout(jmSay, 250); }
    };
    if (window.WindtpData.vocabSync("ja")) return ready();
    toast("Đang tải đề thi…");
    return window.WindtpData.vocab("ja").then(ready, function () { toast("Không tải được dữ liệu, hãy kiểm tra mạng rồi thử lại"); });
  }
  function jlptButton(lang, cert) {
    return lang && lang.code === "ja" && cert && cert.id === "jlpt" ? '<button data-action="jlpt-menu" class="w-full ' + btnPrimary + '">🎌 Đề thi tiếng Nhật: Luyện tập &amp; Thi thử</button>' : "";
  }
  Object.assign(actions, {
    "jlpt-real": function () { jmStop(); jm = null; jmRealList(); },
    "jlpt-real-exam": function (el) { jmRealLoad("jlpt-n2").then(function (d) { var en = d.exams.filter(function (x) { return x.id === el.dataset.id; })[0]; if (en) openModal(function () { return jmRealDetail(en); }); }); },
    "jlpt-real-go": function (el) { jmRealStart(el.dataset.id, el.dataset.mode === "mock" ? "mock" : "practice", el.dataset.s != null ? Number(el.dataset.s) : null); },
    "jlpt-menu": function () { jmStop(); jm = null; openModal(jmMenu); },
    "jlpt-exam": function (el) { jmStop(); var e = jmEx(el.dataset.id); if (e) openModal(function () { return jmDetail(e); }); },
    "jlpt-go": function (el) { jmStart(el.dataset.id, el.dataset.mode === "mock" ? "mock" : "practice", el.dataset.s != null ? Number(el.dataset.s) : null); },
    "jlpt-begin": function () {
      if (!jm || !jm.wait) return; jm.wait = false; jm.idx = jm.secs[jm.si].from; jm.end = Date.now() + jm.secs[jm.si].def.min * 60000;
      jmStop(); jmTimer = setInterval(jmTick, 1000); openModal(jmRender); setTimeout(jmSay, 200);
    },
    "jlpt-pick": function (el) {
      if (!jm || jm.done || jm.wait) return;
      if (jm.mode === "practice" && jm.ans[jm.idx] != null) return;
      jm.ans[jm.idx] = Number(el.dataset.i); openModal(jmRender);
    },
    "jlpt-nav": function (el) {
      if (!jm || jm.done || jm.wait) return;
      var s = jm.mode === "mock" ? jm.secs[jm.si] : { from: 0, to: jm.qs.length - 1 };
      jm.idx = Math.min(s.to, Math.max(s.from, jm.idx + Number(el.dataset.d))); openModal(jmRender); setTimeout(jmSay, 150);
    },
    "jlpt-go-q": function (el) { if (!jm || jm.done || jm.wait) return; jm.idx = Number(el.dataset.i); openModal(jmRender); },
    "jlpt-say": function () { jmSay(); },
    "jlpt-rsay": function (el) { jmSay(Number(el.dataset.i)); },
    "jlpt-submit": function () {
      if (!jm || jm.done || jm.wait) return;
      var s = jm.mode === "mock" ? jm.secs[jm.si] : { from: 0, to: jm.qs.length - 1 }, blank = 0;
      for (var i = s.from; i <= s.to; i++) if (jm.ans[i] == null) blank++;
      var lastSec = jm.mode !== "mock" || jm.si >= jm.secs.length - 1;
      if (!confirm((blank ? "Còn " + blank + " câu chưa làm. " : "") + (lastSec ? "Nộp bài?" : "Nộp phần này? Bạn sẽ không quay lại được."))) return;
      if (lastSec) jmFinish(); else jmNextSec(false);
    },
    "jlpt-review": function (el) { if (!jm || !jm.done) return; jm.view = "review"; jm.rf = el.dataset.f || "all"; openModal(jmRender); },
    "jlpt-back": function () { if (!jm) return; jm.view = ""; openModal(jmRender); }
  });
