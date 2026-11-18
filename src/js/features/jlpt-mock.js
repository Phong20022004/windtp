  /* ===== Thi thử JLPT N5–N1 (có tính giờ, chấm điểm theo thang 180) =====
     Câu hỏi do WINDTP tự soạn từ kho từ vựng / ngữ pháp Mimikara Nomi + Cấu trúc ngữ pháp (không sao chép đề thi thật).
     Điểm là ước tính để tự đánh giá, không phải điểm chính thức của JLPT. */
  var JM_LV = ["N5", "N4", "N3", "N2", "N1"];
  var JM_MIN = [30, 35, 40, 45, 50];
  var JM_PASS = [80, 80, 95, 90, 100];
  var JM_SEC_MIN = 19;
  var JM_SECS = [["lang", "言語知識 (文字・語彙・文法)"], ["read", "読解 (Đọc hiểu)"], ["listen", "聴解 (Nghe)"]];
  var jm = null, jmTimer = 0;
  function jmHist() { try { return JSON.parse(localStorage.getItem("wd_jlpt") || "[]") || []; } catch (e) { return []; } }
  function jmHistSave(r) { try { var a = jmHist(); a.unshift(r); localStorage.setItem("wd_jlpt", JSON.stringify(a.slice(0, 20))); } catch (e) {} }
  function jmPick(arr, n, bad) {
    var out = [], pool = shuffle(arr.slice());
    for (var i = 0; i < pool.length && out.length < n; i++) { if (!bad(pool[i], out)) out.push(pool[i]); }
    return out;
  }
  function jmOpts(right, pool, key) {
    var others = [], seen = {}; seen[right] = 1;
    shuffle(pool.slice()).forEach(function (x) { var v = key(x); if (v && !seen[v] && others.length < 3) { seen[v] = 1; others.push(v); } });
    if (others.length < 3) return null;
    var options = shuffle([right].concat(others));
    return { options: options, answer: options.indexOf(right) };
  }
  function jmWords(lv) {
    var voc = window.WindtpData && window.WindtpData.vocabSync("ja"), bk = voc && voc["Mimikara Nomi|" + lv], out = [];
    (bk || []).forEach(function (L) { (L[1] || []).forEach(function (w) { if (w && w[0] && w[1] && w[3]) out.push(w); }); });
    return out;
  }
  function jmGram(lv) {
    var voc = window.WindtpData && window.WindtpData.vocabSync("ja"), bk = voc && voc["Cấu trúc ngữ pháp|" + lv], out = [];
    (bk || []).forEach(function (L) { (L[1] || []).forEach(function (g) { if (g && g[0] && g[4]) out.push(g); }); });
    return out;
  }
  function jmBlank(w) {
    var s = w[4] || "", cands = [w[0], w[1]].map(function (t) { return String(t || "").replace(/[（(][^）)]*[）)]/g, "").replace(/[～〜~\s]/g, ""); }).filter(Boolean);
    for (var i = 0; i < cands.length; i++) { var k = s.indexOf(cands[i]); if (k >= 0 && cands[i].length >= 2) return s.slice(0, k) + "＿＿＿" + s.slice(k + cands[i].length); }
    return null;
  }
  function jmBuild(lv) {
    var W = jmWords(lv), G = jmGram(lv), qs = [];
    if (W.length < 12 || G.length < 6) return null;
    var hasK = function (w) { return /[㐀-鿿]/.test(w[0]) && w[0] !== w[1]; };
    // 文字: đọc chữ Hán
    jmPick(W.filter(hasK), 5, function () { return false; }).forEach(function (w) {
      var o = jmOpts(w[1], W, function (x) { return x[1]; }); if (o) qs.push({ sec: "lang", part: "文字", prompt: w[0], sub: "Chọn cách đọc đúng", options: o.options, answer: o.answer });
    });
    // 語彙: nghĩa
    jmPick(W, 5, function () { return false; }).forEach(function (w) {
      var o = jmOpts(w[3], W, function (x) { return x[3]; }); if (o) qs.push({ sec: "lang", part: "語彙", prompt: w[0] + (w[1] && w[1] !== w[0] ? "（" + w[1] + "）" : ""), sub: "Chọn nghĩa đúng", options: o.options, answer: o.answer });
    });
    // 文脈: điền từ vào chỗ trống
    jmPick(W.filter(function (w) { return jmBlank(w); }), 4, function () { return false; }).forEach(function (w) {
      var o = jmOpts(w[0], W, function (x) { return x[0]; }); if (o) qs.push({ sec: "lang", part: "文脈", prompt: jmBlank(w), sub: "Chọn từ điền vào chỗ trống", options: o.options, answer: o.answer });
    });
    // 文法: mẫu ngữ pháp trong câu
    jmPick(G, 6, function () { return false; }).forEach(function (g) {
      var o = jmOpts(g[0], G, function (x) { return x[0]; }); if (o) qs.push({ sec: "lang", part: "文法", prompt: g[4], sub: "Câu này dùng mẫu ngữ pháp nào?", options: o.options, answer: o.answer });
    });
    var S = W.filter(function (w) { return w[4] && w[5]; });
    // 読解: đọc câu → chọn bản dịch
    jmPick(S, 5, function () { return false; }).forEach(function (w) {
      var o = jmOpts(w[5], S, function (x) { return x[5]; }); if (o) qs.push({ sec: "read", part: "読解", prompt: w[4], sub: "Đọc câu và chọn bản dịch đúng", options: o.options, answer: o.answer });
    });
    // 聴解: nghe → chọn bản dịch
    jmPick(S, 5, function (w, got) { return qs.some(function (q) { return q.sec === "read" && q.prompt === w[4]; }); }).forEach(function (w) {
      var o = jmOpts(w[5], S, function (x) { return x[5]; }); if (o) qs.push({ sec: "listen", part: "聴解", prompt: "🎧", sub: "Nghe và chọn ý nghĩa đúng", speak: w[4].replace(/[（(][^）)]*[）)]/g, ""), options: o.options, answer: o.answer });
    });
    return qs.length >= 20 ? qs : null;
  }
  function jmLevelPicker() {
    var h = jmHist();
    var rows = JM_LV.map(function (n, i) {
      return '<button data-action="jlpt-go" data-lv="' + i + '" class="w-full text-left rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 p-3.5"><span class="font-extrabold text-rose-800">JLPT ' + n + '</span> <span class="text-xs text-rose-700">· 30 câu · ' + JM_MIN[i] + ' phút · đạt từ ' + JM_PASS[i] + '/180</span></button>';
    }).join("");
    var hist = h.length ? '<div><p class="text-xs font-bold text-slate-700 mb-1">Lịch sử gần đây</p><ul class="text-xs text-slate-600 space-y-0.5">' + h.slice(0, 6).map(function (r) {
      return '<li>' + esc(r.date) + ' · ' + esc(r.lv) + ' · <b>' + r.total + '/180</b> · ' + (r.pass ? "✅ Đạt" : "❌ Chưa đạt") + '</li>'; }).join("") + '</ul></div>' : "";
    return modalHead("🎌 Thi thử JLPT") + '<div class="p-5 space-y-3"><p class="text-xs text-slate-600">Đề gồm 3 phần như kỳ thi thật: Kiến thức ngôn ngữ (chữ, từ vựng, ngữ pháp), Đọc hiểu và Nghe, có tính giờ. Điểm quy đổi theo thang 180 (mỗi phần 60, cần tối thiểu ' + JM_SEC_MIN + '/phần). Đây là điểm ước tính để tự đánh giá, không phải điểm chính thức.</p>' + rows + hist + '</div>';
  }
  function jmFmt(s) { s = Math.max(0, s); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function jmRender() {
    if (!jm) return "";
    if (jm.done) return jmResult();
    var q = jm.qs[jm.idx], a = jm.ans[jm.idx], last = jm.idx === jm.qs.length - 1;
    var opts = q.options.map(function (o, i) {
      return '<button data-action="jlpt-pick" data-i="' + i + '" class="w-full text-left rounded-xl border px-3 py-2.5 text-sm ' + (a === i ? "border-rose-500 bg-rose-50 font-bold" : "border-slate-200 bg-white") + '">' + esc(o) + '</button>';
    }).join("");
    var listen = q.speak ? '<button data-action="jlpt-say" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-sm">🔊 Nghe lại</button>' : '<p class="text-xl font-bold text-slate-800 leading-relaxed">' + esc(q.prompt) + '</p>';
    var answered = jm.ans.filter(function (x) { return x != null; }).length;
    return modalHead("🎌 JLPT " + JM_LV[jm.lv] + " · " + esc(q.part)) + '<div class="p-5 space-y-3">' +
      '<div class="flex justify-between text-xs text-slate-500"><span>Câu ' + (jm.idx + 1) + '/' + jm.qs.length + ' · đã làm ' + answered + '</span><b id="jm-timer" class="text-rose-600">⏱ ' + jmFmt(Math.ceil((jm.end - Date.now()) / 1000)) + '</b></div>' +
      '<p class="text-xs text-slate-500">' + esc(q.sub) + '</p>' + listen + '<div class="space-y-2">' + opts + '</div>' +
      '<div class="flex gap-2 pt-1"><button data-action="jlpt-nav" data-d="-1" class="flex-1 ' + btnGhost + '"' + (jm.idx ? "" : " disabled") + '>← Trước</button>' +
      (last ? '<button data-action="jlpt-submit" class="flex-1 ' + btnPrimary + '">Nộp bài</button>' : '<button data-action="jlpt-nav" data-d="1" class="flex-1 ' + btnPrimary + '">Sau →</button>') + '</div>' +
      '<button data-action="jlpt-submit" class="w-full text-xs text-slate-500 underline">Nộp bài sớm</button></div>';
  }
  function jmScore() {
    var tot = {}, ok = {};
    JM_SECS.forEach(function (s) { tot[s[0]] = 0; ok[s[0]] = 0; });
    jm.qs.forEach(function (q, i) { tot[q.sec]++; if (jm.ans[i] === q.answer) ok[q.sec]++; });
    var secs = JM_SECS.map(function (s) { return tot[s[0]] ? Math.round(60 * ok[s[0]] / tot[s[0]]) : 0; });
    var total = secs[0] + secs[1] + secs[2];
    var pass = total >= JM_PASS[jm.lv] && secs.every(function (x) { return x >= JM_SEC_MIN; });
    return { secs: secs, total: total, pass: pass, ok: ok, tot: tot };
  }
  function jmResult() {
    var r = jm.result, wrong = [];
    jm.qs.forEach(function (q, i) { if (jm.ans[i] !== q.answer) wrong.push({ q: q, i: i }); });
    var rows = JM_SECS.map(function (s, k) { var bad = r.secs[k] < JM_SEC_MIN; return '<div class="flex justify-between text-sm"><span>' + esc(s[1]) + '</span><b class="' + (bad ? "text-rose-600" : "text-emerald-600") + '">' + r.secs[k] + '/60 <span class="text-xs font-normal">(' + r.ok[s[0]] + '/' + r.tot[s[0]] + ' câu)</span></b></div>'; }).join("");
    var rev = wrong.slice(0, 12).map(function (x) {
      return '<li class="text-xs text-slate-600"><b>' + (x.i + 1) + '.</b> ' + esc(x.q.speak || x.q.prompt) + ' → <span class="text-emerald-700 font-bold">' + esc(x.q.options[x.q.answer]) + '</span>' + (jm.ans[x.i] != null ? ' <span class="text-rose-600 line-through">' + esc(x.q.options[jm.ans[x.i]]) + '</span>' : ' <i>(bỏ trống)</i>') + '</li>'; }).join("");
    return modalHead("🎌 Kết quả JLPT " + JM_LV[jm.lv]) + '<div class="p-5 space-y-3">' +
      '<div class="rounded-2xl p-4 text-center ' + (r.pass ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200") + '"><p class="text-3xl font-extrabold">' + r.total + '<span class="text-base">/180</span></p><p class="font-bold">' + (r.pass ? "✅ Đạt (ước tính)" : "❌ Chưa đạt (ước tính)") + '</p><p class="text-xs text-slate-600 mt-1">Điểm đạt ' + JM_LV[jm.lv] + ': ' + JM_PASS[jm.lv] + '/180 và mỗi phần ≥ ' + JM_SEC_MIN + '/60</p></div>' +
      '<div class="space-y-1">' + rows + '</div>' +
      (wrong.length ? '<div><p class="text-xs font-bold text-slate-700 mb-1">Câu cần xem lại (' + wrong.length + ')</p><ul class="space-y-1">' + rev + '</ul></div>' : '<p class="text-sm font-bold text-emerald-600">Hoàn hảo, không sai câu nào! 🎉</p>') +
      '<div class="flex gap-2"><button data-action="jlpt-menu" class="flex-1 ' + btnGhost + '">Chọn cấp khác</button><button data-action="jlpt-go" data-lv="' + jm.lv + '" class="flex-1 ' + btnPrimary + '">Thi lại</button></div></div>';
  }
  function jmStop() { if (jmTimer) { clearInterval(jmTimer); jmTimer = 0; } }
  function jmFinish() {
    if (!jm || jm.done) return;
    jmStop(); jm.result = jmScore(); jm.done = true;
    var d = new Date();
    jmHistSave({ lv: JM_LV[jm.lv], date: d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear(), total: jm.result.total, secs: jm.result.secs, pass: jm.result.pass });
    openModal(jmRender);
  }
  function jmTick() {
    if (!jm || jm.done || ui.renderModal !== jmRender) { jmStop(); return; }
    var left = Math.ceil((jm.end - Date.now()) / 1000), el = document.getElementById("jm-timer");
    if (el) el.textContent = "⏱ " + jmFmt(left);
    if (left <= 0) { toast("Hết giờ! Bài thi đã được nộp."); jmFinish(); }
  }
  function jmSay() { var q = jm && jm.qs[jm.idx]; if (q && q.speak) speak(q.speak, "ja-JP"); }
  function jmStart(lv) {
    var go = function () {
      var qs = jmBuild(lv);
      if (!qs) { toast("Chưa đủ dữ liệu để tạo đề " + JM_LV[lv] + ", hãy thử lại sau"); return; }
      jm = { lv: lv, qs: qs, idx: 0, ans: [], end: Date.now() + JM_MIN[lv] * 60000, done: false };
      openModal(jmRender); jmStop(); jmTimer = setInterval(jmTick, 1000);
      setTimeout(jmSay, 250);
    };
    var ready = async function () {
      if (lv > 0 && !hasCourse("ja")) { lockWith("ja"); return; }
      if (lv > 0 && typeof econEnsureFullVocab === "function" && !(await econEnsureFullVocab("ja"))) return;
      go();
    };
    if (window.WindtpData.vocabSync("ja")) return ready();
    toast("Đang tải đề thi…");
    return window.WindtpData.vocab("ja").then(ready, function () { toast("Không tải được dữ liệu, hãy kiểm tra mạng rồi thử lại"); });
  }
  function jlptButton(lang, cert) {
    return lang && lang.code === "ja" && cert && cert.id === "jlpt" ? '<button data-action="jlpt-menu" class="w-full ' + btnPrimary + '">🎌 Thi thử JLPT có tính giờ (N5–N1)</button>' : "";
  }
  Object.assign(actions, {
    "jlpt-menu": function () { jmStop(); jm = null; openModal(jmLevelPicker); },
    "jlpt-go": function (el) { jmStart(Number(el.dataset.lv) || 0); },
    "jlpt-pick": function (el) { if (!jm || jm.done) return; jm.ans[jm.idx] = Number(el.dataset.i); openModal(jmRender); },
    "jlpt-nav": function (el) { if (!jm || jm.done) return; jm.idx = Math.min(jm.qs.length - 1, Math.max(0, jm.idx + Number(el.dataset.d))); openModal(jmRender); setTimeout(jmSay, 150); },
    "jlpt-say": jmSay,
    "jlpt-submit": function () {
      if (!jm || jm.done) return;
      var blank = jm.qs.length - jm.ans.filter(function (x) { return x != null; }).length;
      if (blank > 0 && !confirm("Còn " + blank + " câu chưa làm. Nộp bài?")) return;
      jmFinish();
    }
  });
