  /* ===== Luyện viết chữ Hán theo từng bài: giáo trình đầu tiên của tiếng Trung (Giáo trình Hán ngữ · Tập 1) và tiếng Nhật (Nihongo · Sơ cấp 1) =====
     Dùng lại trình xem nét / luyện viết trong hanzi-writer-learn-ui.js; file này lo danh sách chữ của từng bài, tiến độ đã viết và điều hướng bài. */
  var LW_BOOKS = { zh: { name: "Giáo trình Hán ngữ", g: 0, v: 0 }, ja: { name: "Nihongo", g: 0, v: 0 } };
  var LW_PAGE = 6;
  var LW_HAN = /[㐀-鿿豈-﫿]/;
  function lwEnabled(code, g, v) {
    var b = LW_BOOKS[code], grp = (BOOK_CATALOG[code] || [])[g];
    return !!(b && grp && b.g === g && b.v === v && grp[0] === b.name);
  }
  function lwBook(code) {
    var voc = window.WindtpData.vocabSync(code), b = LW_BOOKS[code];
    return (voc && b && voc[b.name + "|" + b.v]) || null;
  }
  function lwLessonCount(code, g, v) {
    var bk = lwBook(code), n = lessonsOf(code, g, v).length;
    return n || (bk ? bk.length : 0);
  }
  /** Các chữ Hán (không lặp) của một bài, theo thứ tự xuất hiện trong từ vựng; null nếu chưa có dữ liệu bài đó. */
  function lwChars(code, l) {
    var bk = lwBook(code), L = bk && bk[l];
    if (!L || !L[1]) return null;
    var out = [];
    L[1].forEach(function (w) {
      Array.from(String(w[0] || "")).forEach(function (c) { if (LW_HAN.test(c) && out.indexOf(c) < 0) out.push(c); });
    });
    return out;
  }
  function lwInfo(code, g, v, l) {
    var grp = (BOOK_CATALOG[code] || [])[g] || ["", "", []], row = lessonsOf(code, g, v)[l];
    var no = row && row[2] != null && row[2] !== "" ? row[2] : l + 1;
    return { book: grp[0], vol: grp[2][v] || "", no: no };
  }
  function lwStore() { try { return JSON.parse(localStorage.getItem("wd_lw") || "{}") || {}; } catch (e) { return {}; } }
  function lwDone(code, l) { var a = lwStore()[code + "|" + l]; return Array.isArray(a) ? a : []; }
  function lwMark(code, l, ch) {
    var o = lwStore(), k = code + "|" + l, a = Array.isArray(o[k]) ? o[k] : [];
    if (a.indexOf(ch) >= 0) return;
    a.push(ch); o[k] = a;
    try { localStorage.setItem("wd_lw", JSON.stringify(o)); } catch (e) { }
  }
  /** Khung chọn bài luyện viết, đặt phía trên danh sách bài của giáo trình đầu tiên (chỉ tiếng Trung và tiếng Nhật). */
  function lessonWritePanel(lang, g, v) {
    if (!lwEnabled(lang.code, g, v)) return "";
    var code = lang.code, ja = code === "ja", owned = hasCourse(code), n = lwLessonCount(code, g, v), chips = "";
    for (var i = 0; i < n; i++) {
      var free = v === 0 && i === 0, open = free || owned, chars = lwChars(code, i);
      var prog = chars && chars.length ? '<small>' + Math.min(lwDone(code, i).length, chars.length) + '/' + chars.length + '</small>' : "";
      chips += '<button type="button" data-action="lesson-write" data-l="' + i + '" class="lw-chip' + (open ? "" : " lock") + '" aria-label="Luyện viết bài ' + lwInfo(code, g, v, i).no + (open ? "" : " (Premium)") + '">' +
        (open ? "" : "🔒 ") + 'Bài ' + lwInfo(code, g, v, i).no + prog + '</button>';
    }
    if (!chips) return "";
    return '<section class="lw-panel" aria-label="Luyện viết ' + (ja ? "Kanji" : "chữ Hán") + '"><div class="lw-head"><b>✍️ Luyện viết ' + (ja ? "Kanji" : "chữ Hán") + ' theo bài</b><span>Viết đúng thứ tự nét · tiến độ được lưu · Bài 1 miễn phí</span></div><div class="lw-grid">' + chips + '</div></section>';
  }
  Object.assign(actions, {
    "lesson-write": async (el) => {
      var l = Number(el.dataset.l), v = ui.libVol;
      if (!v || !lwEnabled(v.code, v.g, v.v) || !(l >= 0)) return;
      var code = v.code, free = v.v === 0 && l === 0;
      if (!free && !hasCourse(code)) { lockWith(code); return; }
      if (!window.WindtpData.vocabSync(code)) {
        toast("Đang tải bài học…");
        try { await window.WindtpData.vocab(code); } catch (e) { toast("Không tải được bài học, hãy kiểm tra mạng rồi thử lại"); return; }
      }
      if (!free && DAILY_LANGS.indexOf(code) >= 0 && !(await econEnsureFullVocab(code))) return;
      var chars = lwChars(code, l);
      if (!chars || !chars.length) { toast("Bài này chưa có chữ Hán để luyện viết."); return; }
      ui.strokeLesson = { code: code, g: v.g, v: v.v, l: l, page: 0 };
      ui.strokeTab = "quiz";
      ui.learnStage = "strokes";
      renderLearn();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    "lesson-write-back": () => { ui.strokeLesson = null; ui.learnStage = "lessons"; renderLearn(); window.scrollTo({ top: 0, behavior: "smooth" }); },
    "lesson-write-page": (el) => {
      var S = ui.strokeLesson; if (!S) return;
      var chars = lwChars(S.code, S.l) || [], pages = Math.max(1, Math.ceil(chars.length / LW_PAGE));
      S.page = Math.min(pages - 1, Math.max(0, S.page + Number(el.dataset.d)));
      renderLearn();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    "lesson-write-go": (el) => {
      var S = ui.strokeLesson; if (!S) return;
      var next = S.l + Number(el.dataset.d);
      if (next < 0 || next >= lwLessonCount(S.code, S.g, S.v)) return;
      ui.libVol = { code: S.code, g: S.g, v: S.v };
      return actions["lesson-write"]({ dataset: { l: String(next) } });
    }
  });
