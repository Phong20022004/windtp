  /* ===== Luyện viết chữ Hán theo từng bài (giáo trình tiếng Trung / tiếng Nhật) =====
     Mỗi bài tự lấy chữ Hán từ từ vựng của chính bài đó, 6 chữ / trang, lưu tiến độ theo quyển + bài. */
  var LW_PER = 6, LW_CODES = ["zh", "ja"];
  function lwStore() { try { return JSON.parse(localStorage.getItem("wd_lw") || "{}") || {}; } catch (e) { return {}; } }
  function lwSave(s) { try { localStorage.setItem("wd_lw", JSON.stringify(s)); } catch (e) {} }
  function lwKey(code, g, v, l) { return code + "|" + g + "|" + v + "|" + l; }
  function lwEnabled(code) { return LW_CODES.indexOf(code) >= 0; }
  function lwChars(code, g, v, l) {
    var grp = (BOOK_CATALOG[code] || [])[g];
    var voc = window.WindtpData && window.WindtpData.vocabSync(code);
    var bk = grp && voc && voc[grp[0] + "|" + v], L = bk && bk[l], out = [];
    if (!L || !L[1]) return out;
    var re = /[㐀-䶿一-鿿豈-﫿]/;
    L[1].forEach(function (w) { Array.from(String(w && w[0] || "")).forEach(function (c) { if (re.test(c) && out.indexOf(c) < 0) out.push(c); }); });
    return out;
  }
  function lwRender(st) {
    var ja = st.code === "ja", total = st.chars.length, pages = Math.max(1, Math.ceil(total / LW_PER));
    var part = st.chars.slice(st.page * LW_PER, st.page * LW_PER + LW_PER);
    var done = (lwStore()[st.key] || []);
    var cards = part.map(function (c, i) { return strokeCard(c, "quiz", i).replace('class="st-card"', 'class="st-card lw-card' + (done.indexOf(c) >= 0 ? " lw-done" : "") + '"'); }).join("");
    var body = !total ? '<p class="st-empty">Bài này chưa có chữ Hán để luyện viết.</p>' :
      '<p class="text-xs text-slate-500 mb-2">Trang ' + (st.page + 1) + '/' + pages + ' · đã viết ' + done.filter(function (c) { return st.chars.indexOf(c) >= 0; }).length + '/' + total + ' chữ</p><div class="st-list">' + cards + '</div>' +
      '<div class="flex gap-2 mt-3"><button data-lw="prev" class="flex-1 py-2 rounded-xl bg-slate-100 font-bold text-sm"' + (st.page ? "" : " disabled") + '>← Trước</button><button data-lw="next" class="flex-1 py-2 rounded-xl bg-sky-500 text-white font-bold text-sm"' + (st.page < pages - 1 ? "" : " disabled") + '>Sau →</button></div>';
    return modalHead("✍ Luyện viết · Bài " + esc(String(st.no))) + '<div class="p-4 lw-body">' + body + '</div>';
  }
  function lwBind(st) {
    var host = $("#modal-host"); if (!host) return;
    var list = host.querySelector(".st-list"); if (!list) return;
    loadHanziWriter().catch(function () { return null; }).then(function (HW) {
      list.querySelectorAll(".st-card").forEach(function (card) {
        var ch = card.dataset.ch, body = card.querySelector("[data-st-body]"), msg = card.querySelector("[data-st-msg]"), cnt = card.querySelector("[data-st-count]");
        var fail = function () { msg.textContent = "Không tải được dữ liệu nét. Hãy kiểm tra mạng rồi thử lại."; };
        fetchStroke(ch, st.code).then(function (data) {
          cnt.textContent = " · " + data.strokes.length + " nét";
          if (!HW) return fail();
          var w = HW.create(body, ch, { width: 220, height: 220, padding: 14, showOutline: true, showCharacter: false, strokeColor: "#333333", outlineColor: "#d9d9d9", highlightColor: "#00b4ff", drawingColor: "#333333", drawingWidth: 14, charDataLoader: function (c, ok, bad) { fetchStroke(c, st.code).then(ok, bad); } });
          card._w = w;
          w.quiz({ showHintAfterMisses: 2, highlightOnComplete: true, onComplete: function () {
            msg.textContent = "Hoàn thành! 🎉"; card.classList.add("lw-done");
            var s = lwStore(), a = s[st.key] || []; if (a.indexOf(ch) < 0) a.push(ch); s[st.key] = a; lwSave(s);
          } });
        }).catch(fail);
      });
    });
    host.querySelectorAll("[data-lw]").forEach(function (b) {
      b.onclick = function () { st.page += b.dataset.lw === "next" ? 1 : -1; lwShow(st); };
    });
    list.onclick = function (e) {
      var b = e.target.closest("[data-st]"); if (!b) return; var card = b.closest(".st-card"), w = card._w, ch = card.dataset.ch, a = b.dataset.st;
      if (a === "speak") speak(ch, st.code === "ja" ? "ja-JP" : "zh-CN");
      else if (a === "fav") { var on = strokeToggleFav(ch); b.classList.toggle("on", on); b.textContent = on ? "♥" : "♡"; }
      else if (!w) return;
      else if (a === "play") { try { w.cancelQuiz(); } catch (er) {} w.hideCharacter(); w.animateCharacter({ onComplete: function () { w.hideCharacter(); w.quiz({ showHintAfterMisses: 2, highlightOnComplete: true }); } }); }
      else if (a === "quiz") { w.hideCharacter(); w.quiz({ showHintAfterMisses: 2, highlightOnComplete: true }); }
      else if (a === "outline") { card._ol = !card._ol; card._ol ? w.hideOutline() : w.showOutline(); b.classList.toggle("on", !!card._ol); }
    };
  }
  function lwShow(st) { openModal(function () { return lwRender(st); }); lwBind(st); }
  function lwOpen(el) {
    var code = el.dataset.code, g = Number(el.dataset.g), v = Number(el.dataset.v), l = Number(el.dataset.l);
    if (!lwEnabled(code)) return;
    var free = v === 0 && l === 0;
    if (!free && !hasCourse(code)) { lockWith(code); return; }
    var go = async function () {
      if (!free && typeof econEnsureFullVocab === "function" && !(await econEnsureFullVocab(code))) return;
      var list = lessonsOf(code, g, v), row = list[l] || [];
      lwShow({ code: code, key: lwKey(code, g, v, l), chars: lwChars(code, g, v, l), page: 0, no: row[2] != null && row[2] !== "" ? row[2] : l + 1 });
    };
    if (window.WindtpData.vocabSync(code)) return go();
    toast("Đang tải bài học…");
    return window.WindtpData.vocab(code).then(go, function () { toast("Không tải được bài học, hãy kiểm tra mạng rồi thử lại"); });
  }
  Object.assign(actions, { "lesson-write": function (el, ev) { if (ev && ev.stopPropagation) ev.stopPropagation(); return lwOpen(el); } });
