  /* ===== Bút thuận Hán tự (chỉ tiếng Trung / tiếng Nhật): xem nét, ảnh động, luyện viết ===== */
  var STROKE_LIB = "https://cdn.jsdelivr.net/npm/hanzi-writer@3.5.0/dist/hanzi-writer.min.js";
  var strokeLibP = null, strokeCache = {}, strokeWriters = [], strokeTimer = 0;
  function loadHanziWriter() {
    if (window.HanziWriter) return Promise.resolve(window.HanziWriter);
    if (!strokeLibP) strokeLibP = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = STROKE_LIB;
      s.onload = function () { window.HanziWriter ? res(window.HanziWriter) : (strokeLibP = null, rej(new Error("lib"))); };
      s.onerror = function () { strokeLibP = null; rej(new Error("net")); };
      document.head.appendChild(s);
    });
    return strokeLibP;
  }
  function strokeUrls(ch, code) {
    var c = encodeURIComponent(ch), zh = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/" + c + ".json";
    return code === "ja" ? ["https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0.0.1/" + c + ".json", zh] : [zh];
  }
  function fetchStroke(ch, code) {
    var key = code + ":" + ch;
    if (strokeCache[key]) return strokeCache[key];
    var urls = strokeUrls(ch, code);
    var p = urls.reduce(function (prev, u) {
      return prev.catch(function () { return fetch(u).then(function (r) { if (!r.ok) throw new Error("404"); return r.json(); }); });
    }, Promise.reject(new Error("start")));
    strokeCache[key] = p; p.catch(function () { delete strokeCache[key]; });
    return p;
  }
  function strokeChars(text, code) {
    var re = code === "ja" ? /[぀-ヿ㐀-鿿豈-﫿]/ : /[㐀-鿿豈-﫿]/, out = [];
    Array.from(String(text || "")).forEach(function (c) { if (re.test(c) && out.indexOf(c) < 0) out.push(c); });
    return out.slice(0, 12);
  }
  function strokeFavs() { try { return JSON.parse(localStorage.getItem("wd_stroke_fav") || "[]"); } catch (e) { return []; } }
  function strokeToggleFav(ch) { var f = strokeFavs(), i = f.indexOf(ch); i < 0 ? f.push(ch) : f.splice(i, 1); try { localStorage.setItem("wd_stroke_fav", JSON.stringify(f)); } catch (e) {} return i < 0; }
  var STROKE_GRID = '<svg class="st-grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L100 100M100 0L0 100M50 0V100M0 50H100"/></svg>';
  function strokeMenuCard(lang) {
    var ja = lang.code === "ja";
    return '<button data-action="open-strokes" class="st-menu-card text-left glass-card rounded-3xl p-5 border-0 shadow-lg hover:shadow-xl transition-all md:col-span-2"><div class="flex items-center justify-between"><span class="wl-wrap" style="--ig:rgba(14,165,233,.55)">' + windLogo(54) + '</span><span class="rounded-full text-sky-950 px-3 py-1 text-[10px] font-black shadow" style="background:linear-gradient(90deg,#7dd3fc,#a5f3fc,#c4b5fd)">' + (ja ? "KANJI · KANA" : "HÁN TỰ") + '</span></div><h3 class="text-lg font-black text-teal-600 mt-3">3. Bút thuận ' + (ja ? "Kanji · Kana" : "Hán ngữ") + '</h3><p class="text-xs text-slate-600 mt-2">Xem thứ tự nét · Ảnh động từng nét · Tự tay luyện viết có chấm điểm.</p><p class="text-xs font-bold text-teal-600 mt-4">Mở bảng bút thuận →</p></button>';
  }
  function strokeSteps(data) {
    var n = data.strokes.length, h = "";
    for (var k = 1; k <= n; k++) {
      var paths = data.strokes.slice(0, k).map(function (d, i) { return '<path d="' + d + '" fill="' + (i === k - 1 ? "#00b4ff" : "#333") + '"/>'; }).join("");
      h += '<div class="st-step">' + STROKE_GRID + '<svg viewBox="0 0 1024 1024"><g transform="scale(1,-1) translate(0,-900)">' + paths + '</g></svg><b>' + k + '</b></div>';
    }
    return h;
  }
  function strokeCard(ch, tab, i) {
    var fav = strokeFavs().indexOf(ch) >= 0;
    var ctl = tab === "steps" ? "" :
      '<div class="st-ctl"><button data-st="play" title="Xem lại nét">▶</button>' +
      (tab === "quiz" ? '<button data-st="quiz" title="Luyện viết" class="on">✍</button><button data-st="outline" title="Ẩn/hiện nét mờ">👁</button>' : "") +
      '<button data-st="speak" title="Đọc">🔊</button><button data-st="info" title="Thông tin">ℹ</button><button data-st="fav" title="Yêu thích" class="st-fav' + (fav ? " on" : "") + '">' + (fav ? "♥" : "♡") + '</button></div>';
    var body = tab === "steps" ? '<div class="st-steps" data-st-body>Đang tải nét…</div>' : '<div class="st-box">' + STROKE_GRID + '<div class="st-canvas" data-st-body></div><span class="st-wm">WINDTP</span></div>';
    return '<div class="st-card" data-ch="' + ch + '" data-i="' + i + '"><div class="st-title">' + ch + '<small data-st-count></small></div>' + body + ctl + '<p class="st-msg" data-st-msg></p></div>';
  }
  function renderStrokes(el, lang) {
    var ja = lang.code === "ja", code = lang.code;
    if (ui.strokeText == null) ui.strokeText = ja ? "漢字を書く" : "写汉字";
    if (!ui.strokeTab) ui.strokeTab = "quiz";
    el.innerHTML = '<div class="space-y-4 st-page"><button data-action="learn-back-menu" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700">← Quay lại không gian học</button>' +
      '<div class="wl-banner st-banner rounded-3xl p-5 text-white keep-white"><span class="wl-wrap wl-corner">' + windLogo(56) + '</span><p class="text-xs font-bold opacity-90">WINDTP · BÚT THUẬN ' + (ja ? "KANJI · KANA" : "HÁN NGỮ") + '</p><h2 class="text-xl font-black mt-1">' + lang.flag + ' Xem nét · Ảnh động · Luyện viết</h2><p class="text-sm mt-1 opacity-90">Nhập chữ ' + (ja ? "Kanji / Hiragana / Katakana" : "Hán") + ' cần xem nét (tối đa 12 chữ khác nhau).</p></div>' +
      '<label class="block text-sm font-bold text-slate-700" for="st-input">Chữ ' + (ja ? "Nhật" : "Hán") + ' cần xem nét</label>' +
      '<input id="st-input" class="st-input" type="text" lang="' + (ja ? "ja" : "zh") + '" autocomplete="off" value="' + esc(ui.strokeText) + '">' +
      '<div class="st-tabs" role="tablist">' + [["steps", "Xem nét"], ["gif", "Ảnh GIF"], ["quiz", "Luyện tập"]].map(function (t) { return '<button role="tab" data-st-tab="' + t[0] + '" class="' + (ui.strokeTab === t[0] ? "on" : "") + '">' + t[1] + '</button>'; }).join("") + '</div>' +
      '<div id="st-list" class="st-list"></div></div>';
    var list = el.querySelector("#st-list"), input = el.querySelector("#st-input");
    function build() {
      strokeWriters.forEach(function (w) { try { w.cancelQuiz(); } catch (e) {} }); strokeWriters = [];
      var chars = strokeChars(ui.strokeText, code);
      if (!chars.length) { list.innerHTML = '<p class="st-empty">Hãy nhập ít nhất một chữ ' + (ja ? "Nhật" : "Hán") + '.</p>'; return; }
      list.innerHTML = chars.map(function (c, i) { return strokeCard(c, ui.strokeTab, i); }).join("");
      loadHanziWriter().catch(function () { return null; }).then(function (HW) {
        list.querySelectorAll(".st-card").forEach(function (card) {
          var ch = card.dataset.ch, body = card.querySelector("[data-st-body]"), msg = card.querySelector("[data-st-msg]"), cnt = card.querySelector("[data-st-count]");
          var fail = function () { msg.textContent = "Không tải được dữ liệu nét. Hãy kiểm tra kết nối mạng rồi thử lại."; if (ui.strokeTab === "steps") body.textContent = ""; };
          fetchStroke(ch, code).then(function (data) {
            cnt.textContent = " · " + data.strokes.length + " nét"; card._n = data.strokes.length;
            if (ui.strokeTab === "steps") { body.innerHTML = strokeSteps(data); return; }
            if (!HW) return fail();
            var w = HW.create(body, ch, {
              width: 220, height: 220, padding: 14, showOutline: true, showCharacter: ui.strokeTab === "gif",
              strokeColor: "#333333", outlineColor: "#d9d9d9", highlightColor: "#00b4ff", drawingColor: "#333333", drawingWidth: 14,
              strokeAnimationSpeed: 1, delayBetweenStrokes: 280, delayBetweenLoops: 900,
              charDataLoader: function (c, ok, bad) { fetchStroke(c, code).then(ok, bad); }
            });
            card._w = w; strokeWriters.push(w);
            if (ui.strokeTab === "gif") w.loopCharacterAnimation();
            else w.quiz({ showHintAfterMisses: 2, highlightOnComplete: true, onComplete: function () { msg.textContent = "Hoàn thành! 🎉"; } });
          }).catch(fail);
        });
      });
    }
    el.querySelector(".st-tabs").onclick = function (e) { var b = e.target.closest("[data-st-tab]"); if (!b) return; ui.strokeTab = b.dataset.stTab; renderStrokes(el, lang); };
    input.oninput = function () { ui.strokeText = input.value; clearTimeout(strokeTimer); strokeTimer = setTimeout(build, 450); };
    list.onclick = function (e) {
      var b = e.target.closest("[data-st]"); if (!b) return; var card = b.closest(".st-card"), w = card._w, ch = card.dataset.ch, msg = card.querySelector("[data-st-msg]"), a = b.dataset.st;
      if (a === "speak") speak(ch, ja ? "ja-JP" : "zh-CN");
      else if (a === "fav") { var on = strokeToggleFav(ch); b.classList.toggle("on", on); b.textContent = on ? "♥" : "♡"; }
      else if (a === "info") msg.textContent = card._n ? ch + " có " + card._n + " nét. Viết theo thứ tự nét đã hiển thị." : "Chưa có dữ liệu nét.";
      else if (!w) return;
      else if (a === "play") { try { w.cancelQuiz(); } catch (er) {} w.hideCharacter(); w.animateCharacter({ onComplete: function () { if (ui.strokeTab === "quiz") { w.hideCharacter(); w.quiz({ showHintAfterMisses: 2, highlightOnComplete: true }); } } }); }
      else if (a === "quiz") { msg.textContent = ""; w.hideCharacter(); w.quiz({ showHintAfterMisses: 2, highlightOnComplete: true, onComplete: function () { msg.textContent = "Hoàn thành! 🎉"; } }); }
      else if (a === "outline") { card._ol = !card._ol; card._ol ? w.hideOutline() : w.showOutline(); b.classList.toggle("on", !!card._ol); }
    };
    build();
  }
  function renderLearn() {
    const el = $("#tab-learn");
    if (!el) return;
    const lang = state.lang ? langByCode(state.lang) : null;
    const known = lang ? (state.known[lang.code] ?? []).length : 0;
    // v15-5: vào khóa học chưa mua vẫn xem trang bình thường; chỉ khóa từng quyển Premium trong thư viện.
    if (ui.learnStage === "language" || !lang) {
      el.innerHTML = `<div class="glass-card p-5 rounded-3xl"><div class="text-center mb-5"><div class="flex justify-center">${windLogo(64)}</div><h2 class="text-xl font-black text-slate-800 mt-2">Chọn ngôn ngữ học tập</h2><p class="text-sm text-slate-500 mt-1">Chọn một ngôn ngữ để mở không gian học riêng.</p></div><div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">${LANGUAGES.map(l => `<button data-action="select-lang" data-code="${l.code}" class="rounded-2xl border border-slate-200 bg-white p-4 hover:border-sky-400 hover:shadow-md transition-all flex flex-col items-center gap-2"><span class="text-3xl">${l.flag}</span><span class="text-xs font-extrabold text-slate-700">${l.name}</span></button>`).join("")}</div></div>`;
      return;
    }
    if (ui.learnStage === "menu") {
      el.innerHTML = `<div class="space-y-4"><button data-action="learn-back-language" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700">← Đổi ngôn ngữ</button><div class="rounded-3xl p-5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white keep-white"><p class="text-xs font-bold opacity-90">KHÔNG GIAN HỌC TẬP</p><h2 class="text-2xl font-black mt-1">${lang.flag} ${lang.name}</h2><p class="text-sm mt-1 opacity-90">Chọn cách học của bạn hôm nay.</p></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><button data-action="open-daily-study" class="text-left glass-card rounded-3xl p-5 border-0 shadow-lg hover:shadow-xl transition-all"><div class="flex items-center justify-between"><span class="wl-wrap" style="--ig:rgba(16,185,129,.55)">${windLogo(54)}</span><span class="rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 text-emerald-950 px-3 py-1 text-[10px] font-black shadow">FREE</span></div><h3 class="text-lg font-black text-teal-600 mt-3">1. Ôn tập mỗi ngày</h3><p class="text-xs text-slate-600 mt-2">Từ vựng · Ngữ pháp · Luyện nghe, đọc, viết và hội thoại.</p><p class="text-xs font-bold text-teal-600 mt-4">Vào ôn tập →</p></button><button data-action="open-book-library" class="text-left glass-card rounded-3xl p-5 border-0 shadow-lg hover:shadow-xl transition-all"><div class="flex items-center justify-between"><span class="wl-wrap" style="--ig:rgba(245,158,11,.6)">${windLogo(54)}</span><span class="rounded-full text-amber-950 px-3 py-1 text-[10px] font-black shadow" style="background:linear-gradient(90deg,#fcd34d,#fef08a,#fdba74)">👑 PREMIUM</span></div><h3 class="text-lg font-black text-teal-600 mt-3">2. Học - Luyện Tập - Thi Thử</h3><p class="text-xs text-slate-600 mt-2">Giáo trình · Tài liệu · Đề thi thử</p><p class="text-[11px] font-bold text-emerald-700 mt-1">🆓 Bài 1 · Quyển 1 miễn phí · các quyển còn lại cần Premium</p><p class="text-xs font-bold text-emerald-700 mt-4">Vào học - luyện tập - thi thử →</p></button>${lang.code === "zh" || lang.code === "ja" ? strokeMenuCard(lang) : ""}</div></div>`;
      return;
    }
    if (ui.learnStage === "strokes" && (lang.code === "zh" || lang.code === "ja")) {
      renderStrokes(el, lang);
      return;
    }
    if (ui.learnStage === "library") {
      el.innerHTML = renderBookLibrary(lang);
      return;
    }
    if (ui.learnStage === "lessons") {
      el.innerHTML = renderLessonList(lang);
      return;
    }
    if (!dailyReady(lang)) {
      enrichDaily(lang);
      el.innerHTML = `<div class="glass-card p-5 rounded-3xl text-center text-sm font-bold text-slate-500">Đang tải bài học hôm nay…</div>`;
      return;
    }
    const dl = dailyLesson(lang);
    el.innerHTML = `<div class="space-y-4"><div class="flex flex-wrap items-center justify-between gap-2"><button data-action="learn-back-menu" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700">← Quay lại không gian học</button><span class="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">${lang.flag} ${lang.name} · MIỄN PHÍ · ${dl.dateLabel}</span></div><div class="wl-banner rounded-3xl p-5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white keep-white"><span class="wl-wrap wl-corner">${windLogo(56)}</span><p class="text-xs font-bold opacity-90">ÔN TẬP MỖI NGÀY · ĐỀ NGÀY ${dl.no}/365</p><h2 class="text-2xl font-black mt-1">Học một chút mỗi ngày</h2><p class="text-sm mt-1 opacity-90">Từ vựng · Ngữ pháp · Nghe · Đọc · Viết · Hội thoại</p></div><div class="grid grid-cols-1 sm:grid-cols-3 gap-3"><button data-action="open-vocab" class="text-left p-4 bg-white rounded-2xl border border-slate-200 hover:border-sky-400 shadow-sm"><div class="text-2xl">📖</div><h3 class="font-extrabold text-sm text-sky-700 mt-2">Từ vựng</h3><p class="text-xs text-slate-500 mt-1">5 từ của đề hôm nay · Đã thuộc ${dl.knownCount}/5</p></button><button data-action="open-grammar" class="text-left p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 shadow-sm"><div class="text-2xl">✍️</div><h3 class="font-extrabold text-sm text-indigo-700 mt-2">Ngữ pháp</h3><p class="text-xs text-slate-500 mt-1">2 cấu trúc của đề hôm nay kèm ví dụ.</p></button><button data-action="open-practice" class="text-left p-4 bg-white rounded-2xl border border-teal-200 hover:border-teal-400 shadow-sm"><div class="text-2xl">🎧</div><h3 class="font-extrabold text-sm text-teal-700 mt-2">Luyện tập 4 kỹ năng</h3><p class="text-xs text-slate-500 mt-1">Nghe · Đọc · Viết · Hội thoại tình huống.</p></button></div></div>`;
  }
  var STALLS = {
    fashion: { no: 1, emoji: "👗", name: "Thời trang, Mỹ phẩm và Phụ kiện", desc: "Thời trang nam nữ, giày dép, mỹ phẩm, phụ kiện, đồng hồ và mắt kính." },
    food: { no: 2, emoji: "🍜", name: "Đồ ăn và Thực phẩm", desc: "Thực phẩm tươi sống, đồ khô, đồ chế biến sẵn, ăn vặt và đồ uống." },
    tech: { no: 3, emoji: "🎧", name: "Thiết bị Công nghệ", desc: "Thiết bị di động, máy tính và phụ kiện công nghệ." },
    supp: { no: 4, emoji: "💊", name: "Thuốc và Thực phẩm chức năng", desc: "Thuốc và thực phẩm chức năng.", note: "Thực phẩm chức năng không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh." },
    study: { no: 5, emoji: "📚", name: "Khóa học và Tài liệu", desc: "Khóa học và tài liệu học tập.", both: true }
  };
  var STALL_SUBS = {
    fashion: ["Thời trang Nam", "Thời trang Nữ", "Giày dép", "Mỹ phẩm và Chăm sóc cá nhân", "Phụ kiện thời trang", "Đồng hồ và Mắt kính"],
    food: ["Thực phẩm tươi sống", "Đồ khô và Gia vị", "Thức ăn nhanh và Đồ chế biến sẵn", "Ăn vặt và Bánh kẹo", "Đồ uống"],
    tech: ["Thiết bị di động", "Máy tính", "Phụ kiện công nghệ"],
    supp: ["Thuốc", "Thực phẩm chức năng"],
    study: ["Khóa học", "Tài liệu"]
  };
  var SHOP_CATS = [["all", "Tất cả"]].concat(Object.keys(STALLS).map((k) => [k, "Gian " + STALLS[k].no + " · " + STALLS[k].name]));
  function xuView() {
    return ui.shopCat === "study" && ui.shopSub === "Tài liệu";
  }
  function payNote() {
    if (ui.shopCat === "study") return "Khóa học thanh toán bằng <b>tiền</b> (VND / KRW / JPY). Mỗi gói mở khóa <b>Premium</b> trong thời gian học và tặng <b>chip game</b>. Xu không dùng để mua khóa học.";
    if (ui.shopCat === "all") return "Gian 1–4 chỉ thanh toán bằng tiền (VND / KRW / JPY). Gian 5 · Khóa học mua bằng tiền, Tài liệu mua bằng Xu hoặc tiền. Mua sắm xong, vào nhiệm vụ để nhận Xu thưởng.";
    return "Gian này chỉ thanh toán bằng tiền (<b>VND / KRW / JPY</b>), không dùng Xu. Mua sắm xong, vào nhiệm vụ để nhận Xu thưởng.";
  }
  var STALL_SHORT = { fashion: "Thời trang & Mỹ phẩm", food: "Đồ ăn & Thực phẩm", tech: "Thiết bị công nghệ", supp: "Thuốc & TPCN", study: "Khóa học & Tài liệu" };
  function stallStrip() {
    return `<div class="stall-strip">${Object.keys(STALLS).map((k) => {
      const t = STALLS[k], st = STALL_STYLE[k], on = ui.shopCat === k;
      return `<button data-action="shop-cat" data-cat="${k}" aria-pressed="${on}" class="stall-mini${on ? " on" : ""}${ui.shopCat !== "all" && !on ? " dim" : ""}" aria-label="Gian ${t.no}: ${t.name}"><span class="stall-mini-img" style="background:${st.bg}"><img src="${STALL_IMG[k]}" alt=""></span><span class="stall-mini-label" style="background:${st.grad};color:${st.ink}">${STALL_SHORT[k]}</span></button>`;
    }).join("")}</div>`;
  }
  function stallHeader() {
    const s = STALLS[ui.shopCat];
    if (!s) return stallStrip();
    const badge = s.both
      ? '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">💵 Khóa học: tiền · 📄 Tài liệu: Xu hoặc tiền</span>'
      : '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">💵 Chỉ thanh toán bằng tiền</span>';
    const pay = "";
    const note = s.note ? `<p class="text-[10px] text-rose-600 mt-1">${s.note}</p>` : "";
    return `${stallStrip()}<div class="glass-card rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
      <div class="flex items-center gap-3">${stallAvatar(ui.shopCat, 56)}<div><h3 class="text-sm font-extrabold text-slate-800">Gian ${s.no}: ${s.name}</h3><p class="text-[11px] text-slate-500">${s.desc}</p>${note}</div></div>
      <div class="flex flex-col items-start sm:items-end gap-2">${badge}${pay}</div>
    </div>`;
  }
  function cartCount() {
    return Object.values(state.cart).reduce((a, b) => a + b, 0);
  }
  function cartTotal() {
    const cur = state.settings.currency;
    return Object.entries(state.cart).reduce((sum, [id, q]) => {
      const p = PRODUCTS.find((x) => x.id === id);
      return sum + (p ? p.price[cur] * q : 0);
    }, 0);
  }
