  /* ===== Thi thử đề thật: danh sách kỳ thi + cấu trúc đề, làm bài có đồng hồ, chấm điểm theo phần, xem lại câu sai ===== */
  var examUi = { sys: null, run: null, timer: 0 };
  function examPaper(id) { return EXAM_PAPERS.filter(function (p) { return p.id === id; })[0]; }
  function examSystem(id) { return EXAM_SYSTEMS.filter(function (s) { return s.id === id; })[0]; }
  function examNorm(s) { return String(s || "").replace(/[\s　.。,，?？!！]/g, "").toLowerCase(); }
  var EXAM_MARK = ["ㄱ", "ㄴ", "ㄷ", "ㄹ"];
  function examFilled(ans) {
    if (Array.isArray(ans)) return ans.some(function (a) { return examNorm(a) !== ""; });
    return ans !== undefined && ans !== null && ans !== "";
  }
  function examOne(accepted, typed) { return accepted.some(function (t) { return examNorm(t) === examNorm(typed); }); }
  function examIsRight(item, ans) {
    if (!examFilled(ans)) return false;
    if (item.blanks) return Array.isArray(ans) && item.blanks.every(function (b, k) { return examOne(b, ans[k]); });
    if (item.text) return item.text.some(function (t) { return examNorm(t) === examNorm(ans); });
    return ans === item.a;
  }
  function examClock(sec) {
    sec = Math.max(0, sec);
    return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
  }
  function examHomeHtml() {
    var sys = examSystem(examUi.sys);
    var tabs = EXAM_SYSTEMS.map(function (s) {
      return '<button type="button" data-action="exam-sys" data-id="' + s.id + '" class="exam-chip' + (s.id === examUi.sys ? " on" : "") + '">' + s.flag + " " + esc(s.name) + "</button>";
    }).join("");
    var papers = EXAM_PAPERS.filter(function (p) { return p.sys === sys.id; });
    return modalHead("📝 Thi thử đề thật") + '<div class="exam-wrap"><div class="exam-tabs">' + tabs + "</div>" +
      '<div class="exam-card"><b>Cấu trúc đề</b><ul class="exam-sec">' + sys.sections.map(function (x) {
        return "<li><b>" + esc(x.n) + "</b><span>" + esc(x.d) + "</span></li>";
      }).join("") + "</ul>" +
      '<p><b>⏱ Thời gian:</b> ' + esc(sys.time) + "</p><p><b>🎯 Thang điểm:</b> " + esc(sys.score) + "</p><p><b>✅ Mốc đậu:</b> " + esc(sys.pass) + "</p></div>" +
      "<b class=\"exam-h\">Đề làm trong app</b>" +
      (papers.length ? papers.map(function (p) {
        return '<div class="exam-card"><b>' + esc(p.title) + "</b><p>" + p.items.length + " câu · thi thử " + p.minutes + " phút" +
          (p.fullMinutes ? " (đề gốc " + p.fullCount + " câu / " + p.fullMinutes + " phút, giờ được tính theo tỷ lệ số câu)" : "") + "</p><p class=\"exam-note\">" + esc(p.note) + "</p>" +
          '<div class="exam-modes"><button type="button" class="exam-btn ghost" data-action="exam-start" data-mode="practice" data-id="' + p.id + '">📖 Luyện tập<small>không tính giờ, có đáp án ngay</small></button>' +
          '<button type="button" class="exam-btn keep-white" data-action="exam-start" data-mode="mock" data-id="' + p.id + '">⏱ Thi thử<small>' + p.minutes + ' phút, xem đáp án sau khi nộp</small></button></div></div>';
      }).join("") : '<div class="exam-card"><p class="exam-note">Đề của kỳ thi này đang được nạp thêm từ thư mục trên Google Drive. Bạn vẫn xem được cấu trúc đề ở trên để chuẩn bị.</p></div>') +
      "</div>";
  }
  function examQuestionHtml() {
    var r = examUi.run, it = r.paper.items[r.i], ans = r.ans[r.i];
    var secs = [];
    r.paper.items.forEach(function (x) { if (secs.indexOf(x.sec) < 0) secs.push(x.sec); });
    var pal = r.paper.items.map(function (x, k) {
      var done = examFilled(r.ans[k]);
      return '<button type="button" data-action="exam-jump" data-i="' + k + '" class="exam-dot' + (done ? " done" : "") + (k === r.i ? " cur" : "") + '" aria-label="Câu ' + (k + 1) + '">' + (k + 1) + "</button>";
    }).join("");
    var practice = r.mode === "practice", checked = practice && r.checked[r.i], body;
    if (it.blanks) {
      var mine = Array.isArray(ans) ? ans : [];
      body = '<div class="exam-blanks">' + it.blanks.map(function (b, k) {
        var ok = checked && examOne(b, mine[k]);
        return '<label class="exam-blank"><b>( ' + EXAM_MARK[k] + ' )</b><input id="exam-b' + k + '" class="exam-input' + (checked ? (ok ? " ok" : " ng") : "") + '" type="text" autocomplete="off" lang="ko" value="' + esc(mine[k] || "") + '" placeholder="Điền vào chỗ trống"' + (checked ? " disabled" : k === 0 ? " data-autofocus" : "") + "></label>" +
          (checked ? '<p class="' + (ok ? "good" : "bad") + '">' + (ok ? "✓ Khớp đáp án tham khảo" : "✗ Đáp án tham khảo: " + esc(b.join(" / "))) + "</p>" : "");
      }).join("") + "</div>" +
        (practice && !checked ? '<button type="button" class="exam-btn keep-white" data-action="exam-check">Kiểm tra</button>' : "") +
        '<p class="exam-note">Đáp án tham khảo, có thể còn cách viết đúng khác. Khoảng trắng và dấu câu không bị tính.</p>';
    } else if (it.text) {
      body = '<input id="exam-text" class="exam-input" type="text" autocomplete="off" value="' + esc(ans || "") + '" placeholder="Nhập đáp án"' + (checked ? " disabled" : " data-autofocus") + ">" +
        (practice && !checked ? '<button type="button" class="exam-btn keep-white" data-action="exam-check">Kiểm tra</button>' : "") +
        (checked ? '<p class="' + (examIsRight(it, ans) ? "good" : "bad") + '">' + (examIsRight(it, ans) ? "✓ Đúng" : "✗ Sai. Đáp án: " + esc(it.text[0])) + "</p>" : "");
    } else {
      body = '<div class="exam-opts">' + it.opts.map(function (o, k) {
        var cls = ans === k ? " on" : "";
        if (checked) cls += k === it.a ? " right" : ans === k ? " wrong" : "";
        return '<button type="button" data-action="exam-pick" data-k="' + k + '" class="exam-opt' + cls + '"' + (checked ? " disabled" : "") + '><b>' + String.fromCharCode(65 + k) + "</b><span>" + esc(o) + "</span></button>";
      }).join("") + "</div>" + (checked ? '<p class="' + (ans === it.a ? "good" : "bad") + '">' + (ans === it.a ? "✓ Đúng" : "✗ Sai. Đáp án đúng: " + String.fromCharCode(65 + it.a)) + "</p>" : "");
    }
    return modalHead("📝 " + esc(r.paper.title)) + '<div class="exam-wrap"><div class="exam-bar"><span id="exam-clock" class="exam-clock">' + (practice ? "📖 Luyện tập · không tính giờ" : "⏱ " + examClock(r.left)) + "</span><span>Câu " + (r.i + 1) + "/" + r.paper.items.length + (it.n ? " (đề gốc câu " + it.n + ")" : "") + "</span></div>" +
      '<div class="exam-pal">' + pal + "</div>" +
      '<div class="exam-card"><small>' + esc(it.sec) + "</small>" +
      (it.p ? '<div class="exam-p" lang="' + esc(r.paper.lang) + '">' + esc(it.p).replace(/\n/g, "<br>") + "</div>" : "") +
      (it.speak ? '<button type="button" class="exam-btn exam-listen keep-white" data-action="exam-speak">🔊 Nghe đề (' + (r.plays[r.i] || 0) + " lần)</button>" : "") +
      '<p class="exam-q" lang="' + esc(r.paper.lang) + '">' + esc(it.q).replace(/\n/g, "<br>") + "</p>" + body + "</div>" +
      '<div class="exam-nav"><button type="button" class="exam-btn ghost" data-action="exam-go" data-d="-1"' + (r.i === 0 ? " disabled" : "") + ">← Trước</button>" +
      (r.i === r.paper.items.length - 1
        ? '<button type="button" class="exam-btn keep-white" data-action="exam-finish">' + (practice ? "Hoàn thành" : "Nộp bài") + "</button>"
        : '<button type="button" class="exam-btn keep-white" data-action="exam-go" data-d="1">Sau →</button>') + "</div></div>";
  }
  function examResultHtml() {
    var r = examUi.run, per = {}, order = [], right = 0;
    r.paper.items.forEach(function (it, k) {
      var ok = examIsRight(it, r.ans[k]);
      if (!per[it.sec]) { per[it.sec] = { n: 0, ok: 0 }; order.push(it.sec); }
      per[it.sec].n++;
      if (ok) { per[it.sec].ok++; right++; }
    });
    var total = r.paper.items.length, pct = Math.round(right * 100 / total);
    var all = r.paper.items.map(function (it, k) { return { it: it, k: k }; });
    var wrong = all.filter(function (x) { return !examIsRight(x.it, r.ans[x.k]); });
    var list = r.showAll ? all : wrong;
    return modalHead("📝 Kết quả") + '<div class="exam-wrap"><div class="exam-card exam-score"><b>' + right + "/" + total + " câu đúng</b><span>" + pct + "%</span>" +
      (r.paper.section === "reading" ? "<p>Quy đổi thang đọc TOPIK II: <b>" + pct + "/100</b></p>" : "") + "<p>" + (r.mode === "practice" ? "Luyện tập" : "Thi thử") + " · thời gian làm: " + examClock(r.spent) + (r.mode === "mock" ? " / " + examClock(r.paper.minutes * 60) : "") + (r.timeUp ? " (hết giờ)" : "") + "</p></div>" +
      '<div class="exam-card"><b>Theo từng phần</b>' + order.map(function (s) {
        var p = per[s], w = Math.round(p.ok * 100 / p.n);
        return '<div class="exam-row"><span>' + esc(s) + "</span><span>" + p.ok + "/" + p.n + '</span><i style="--w:' + w + '%"></i></div>';
      }).join("") + "</div>" +
      '<button type="button" class="exam-btn ghost" data-action="exam-review">' + (r.showAll ? "Chỉ xem câu sai" : "Xem đáp án toàn bộ " + total + " câu") + "</button>" +
      (list.length ? '<div class="exam-card"><b>' + (r.showAll ? "Đáp án toàn bộ (" : "Câu cần xem lại (") + list.length + ")</b>" + list.map(function (x) {
        var it = x.it, mine = r.ans[x.k], good = it.blanks ? it.blanks.map(function (b, k) { return "( " + EXAM_MARK[k] + " ) " + b.join(" / "); }).join("  ·  ") : it.text ? it.text[0] : String.fromCharCode(65 + it.a) + ". " + it.opts[it.a];
        var yours = !examFilled(mine) ? "Chưa trả lời" : (it.blanks ? it.blanks.map(function (b, k) { return "( " + EXAM_MARK[k] + " ) " + (mine[k] || "—"); }).join("  ·  ") : it.text ? mine : String.fromCharCode(65 + mine) + ". " + it.opts[mine]);
        return '<div class="exam-rev"><small>Câu ' + (x.k + 1) + (it.n ? " (đề gốc " + it.n + ")" : "") + " · " + esc(it.sec) + (examIsRight(it, r.ans[x.k]) ? " · ✓ đúng" : " · ✗ sai") + '</small>' +
          (it.p ? '<p class="exam-rp" lang="' + esc(r.paper.lang) + '">' + esc(it.p).replace(/\n/g, "<br>") + "</p>" : "") +
          '<p lang="' + esc(r.paper.lang) + '">' + esc(it.q).replace(/\n/g, "<br>") + '</p>' +
          (it.speak ? '<p class="exam-rp" lang="' + esc(r.paper.lang) + '">🔊 ' + esc(it.speak) + "</p>" : "") +
          (examIsRight(it, r.ans[x.k]) ? "" : '<p class="bad">Bạn chọn: ' + esc(yours) + "</p>") + '<p class="good">' + (it.blanks ? "Đáp án tham khảo: " : "Đáp án: ") + esc(good) + "</p></div>";
      }).join("") + "</div>" : '<div class="exam-card"><b>🎉 Đúng toàn bộ!</b></div>') +
      '<p class="exam-note">Điểm ở đây là số câu đúng trong đề mẫu, chưa quy đổi theo thang điểm chính thức của kỳ thi.</p>' +
      '<div class="exam-nav"><button type="button" class="exam-btn ghost" data-action="exam-home">Về danh sách</button><button type="button" class="exam-btn keep-white" data-action="exam-start" data-id="' + r.paper.id + '">Làm lại</button></div></div>';
  }
  function examModal() {
    var r = examUi.run;
    if (!r) return examHomeHtml();
    return r.done ? examResultHtml() : examQuestionHtml();
  }
  function examStop() { if (examUi.timer) { clearInterval(examUi.timer); examUi.timer = 0; } }
  function examSaveText() {
    var r = examUi.run, el = document.getElementById("exam-text");
    if (!r || r.done) return;
    if (r.paper.items[r.i].blanks) {
      r.ans[r.i] = r.paper.items[r.i].blanks.map(function (_, k) { var b = document.getElementById("exam-b" + k); return b ? b.value : ""; });
    } else if (el) r.ans[r.i] = el.value;
  }
  function examFinish(timeUp) {
    var r = examUi.run; if (!r || r.done) return;
    examSaveText();
    r.done = true; r.timeUp = !!timeUp; r.spent = Math.round((Date.now() - r.t0) / 1000);
    examStop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    refreshModal();
  }
  function examTick() {
    var r = examUi.run;
    if (!r || r.done || ui.renderModal !== examModal) { examStop(); return; }
    r.left = Math.max(0, r.paper.minutes * 60 - Math.round((Date.now() - r.t0) / 1000));
    var c = document.getElementById("exam-clock"); if (c) c.textContent = "⏱ " + examClock(r.left);
    [10, 5, 1].forEach(function (m) {
      if (r.paper.minutes > m * 2 && r.left <= m * 60 && !r.warned[m]) { r.warned[m] = true; toast("Còn " + m + " phút"); }
    });
    if (r.left <= 0) { toast("Hết giờ, đã nộp bài"); examFinish(true); }
  }
  function examOpen() {
    if (!examUi.sys) examUi.sys = "jlpt";
    examUi.run = null;
    openModal(examModal);
  }
  Object.assign(actions, {
    "open-exam": function () { examOpen(); },
    "exam-sys": function (el) { examUi.sys = el.dataset.id; refreshModal(); },
    "exam-home": function () { examStop(); examUi.run = null; refreshModal(); },
    "exam-start": function (el) {
      var p = examPaper(el.dataset.id); if (!p) return;
      examStop();
      var mode = el.dataset.mode === "practice" ? "practice" : "mock";
      examUi.run = { paper: p, mode: mode, i: 0, ans: [], plays: [], checked: [], warned: {}, showAll: false, done: false, t0: Date.now(), left: p.minutes * 60 };
      openModal(examModal);
      if (mode === "mock") examUi.timer = setInterval(examTick, 1000);
    },
    "exam-pick": function (el) {
      var r = examUi.run; if (!r || r.done || r.checked[r.i]) return;
      r.ans[r.i] = Number(el.dataset.k);
      if (r.mode === "practice") r.checked[r.i] = true;
      refreshModal();
    },
    "exam-check": function () {
      var r = examUi.run; if (!r || r.done || r.mode !== "practice") return;
      examSaveText(); r.checked[r.i] = true; refreshModal();
    },
    "exam-review": function () { var r = examUi.run; if (!r || !r.done) return; r.showAll = !r.showAll; refreshModal(); },
    "exam-go": function (el) {
      var r = examUi.run; if (!r || r.done) return;
      examSaveText();
      r.i = Math.min(r.paper.items.length - 1, Math.max(0, r.i + Number(el.dataset.d)));
      refreshModal();
    },
    "exam-jump": function (el) { var r = examUi.run; if (!r || r.done) return; examSaveText(); r.i = Number(el.dataset.i); refreshModal(); },
    "exam-speak": function () {
      var r = examUi.run; if (!r || r.done) return;
      var it = r.paper.items[r.i];
      r.plays[r.i] = (r.plays[r.i] || 0) + 1;
      speak(it.speak, r.paper.lang);
      refreshModal();
    },
    "exam-finish": function () {
      var r = examUi.run; if (!r) return;
      examSaveText();
      var left = r.paper.items.filter(function (_, k) { return !examFilled(r.ans[k]); }).length;
      if (r.mode === "mock" && left && !window.confirm("Còn " + left + " câu chưa trả lời. Vẫn nộp bài?")) return;
      examFinish(false);
    }
  });
