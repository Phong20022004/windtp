  /* ===== WIND AI: gia sư ngoại ngữ + trợ lý cửa hàng (Cloudflare Workers AI qua máy chủ WINDTP) =====
     Hai lối vào dùng chung một khung chat: nút nổi 🤖 ở mọi màn hình (biết đang ở bài nào, tab nào) và mục "WIND AI" trong tab Tiện ích.
     Máy chủ giữ lời nhắc hệ thống, hạn mức theo ngày và ngân sách Neurons; trình duyệt chỉ gửi nội dung và ngữ cảnh ngắn. */
  var AI_MODES_UI = [
    { id: "chat", icon: "💬", label: "Hỏi đáp", hint: "Hỏi bất cứ điều gì về ngoại ngữ đang học…", hello: "Chào bạn! Mình là WIND AI. Bạn muốn hỏi gì về ngoại ngữ hôm nay?" },
    { id: "explain", icon: "📖", label: "Giải thích từ", hint: "Nhập một từ cần giải thích (ví dụ: 안녕하세요)", hello: "Nhập một từ, mình sẽ giải thích nghĩa, cách đọc và cho ví dụ.", word: true },
    { id: "grammar", icon: "🧩", label: "Ngữ pháp", hint: "Nhập điểm ngữ pháp (ví dụ: ～てください)", hello: "Nhập một điểm ngữ pháp, mình sẽ giải thích cách dùng kèm ví dụ.", word: true },
    { id: "correct", icon: "✍️", label: "Sửa bài viết", hint: "Dán đoạn bạn đã viết bằng ngoại ngữ để mình sửa…", hello: "Dán đoạn văn bạn viết, mình sẽ sửa lỗi và giải thích." },
    { id: "roleplay", icon: "🎭", label: "Nhập vai", hint: "Bắt đầu hội thoại, ví dụ: Xin chào!", hello: "Mình sẽ đóng vai người bản xứ để bạn luyện nói. Hãy chào mình bằng ngoại ngữ đang học nhé!" },
    { id: "shop", icon: "🛍️", label: "Cửa hàng", hint: "Hỏi về sản phẩm, phí ship, thời gian giao…", hello: "Mình có thể trả lời về sản phẩm, phí ship và thời gian giao của WIND Store." },
    { id: "help", icon: "❓", label: "Dùng app", hint: "Hỏi cách dùng một tính năng của WINDTP…", hello: "Bạn cần hướng dẫn tính năng nào của WINDTP?" }
  ];
  var aiSpinners = [];
  var AI_ANCHORS = [
    { k: 0, y: 0 }, { k: 5, y: 30 }, { k: 6, y: 60 }, { k: 1, y: 90 }, { k: 2, y: 120 }, { k: 3, y: 150 }, { k: 4, y: 180 },
    { k: 3, y: 210, flip: true }, { k: 2, y: 240, flip: true }, { k: 1, y: 270, flip: true }, { k: 6, y: 300, flip: true }, { k: 5, y: 330, flip: true }
  ];
  var AI_MAX_LEN = 500;
  var AI_MAX_HISTORY = 6;
  var ai = { mode: "chat", log: {}, busy: false, remaining: null, limit: null, draft: "", stats: null };

  function aiModeInfo(id) { for (var i = 0; i < AI_MODES_UI.length; i++) if (AI_MODES_UI[i].id === id) return AI_MODES_UI[i]; return AI_MODES_UI[0]; }
  function aiLog(mode) { return ai.log[mode] || (ai.log[mode] = []); }

  /** Ngữ cảnh gửi kèm: ngôn ngữ đang học, giáo trình/tập đang mở, tab hiện tại, loại tiền của cửa hàng. */
  function aiContext(extra) {
    var ctx = { lang: state.lang || "", screen: ui.tab || "", currency: (state.settings && state.settings.currency) || "VND" };
    var v = ui.libVol;
    if (v && v.code === state.lang) {
      var grp = (BOOK_CATALOG[v.code] || [])[v.g];
      if (grp) { ctx.book = grp[0]; ctx.level = String(grp[2][v.v] || ""); }
    }
    if (extra) for (var k in extra) ctx[k] = extra[k];
    return ctx;
  }

  /** Định dạng nhẹ: escape trước, rồi **đậm**, `mã`, gạch đầu dòng và xuống dòng. */
  function aiFormat(text) {
    var html = esc(text).replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/`([^`\n]+)`/g, "<code>$1</code>");
    return html.split("\n").map(function (l) { return /^\s*[-*•]\s+/.test(l) ? '<span class="ai-li">• ' + l.replace(/^\s*[-*•]\s+/, "") + "</span>" : l; }).join("<br>");
  }
  function aiBubble(m) {
    if (m.role === "user") return '<div class="ai-msg ai-me">' + esc(m.content).replace(/\n/g, "<br>") + "</div>";
    return '<div class="ai-msg ai-bot' + (m.error ? " ai-err" : "") + '">' + (m.error ? "⚠️ " : "") + aiFormat(m.content) + (m.cached ? '<small class="ai-tag">đã có sẵn · không tốn lượt</small>' : "") + "</div>";
  }
  function aiLogHtml() {
    var info = aiModeInfo(ai.mode), items = aiLog(ai.mode);
    var hello = '<div class="ai-msg ai-bot">' + esc(info.hello) + "</div>";
    return hello + items.map(aiBubble).join("") + (ai.busy ? '<div class="ai-msg ai-bot ai-typing" aria-label="WIND AI đang trả lời"><i></i><i></i><i></i></div>' : "");
  }
  function aiQuotaText() {
    var t = ai.remaining == null ? "Mỗi ngày bạn có một số lượt hỏi miễn phí" : "Còn " + ai.remaining + "/" + ai.limit + " lượt hỏi hôm nay";
    if (ai.stats) t += " · Admin: " + ai.stats.today.neurons + "/" + ai.stats.budget + " Neurons hôm nay (" + ai.stats.today.calls + " tin)";
    return t;
  }
  function aiModal() {
    var info = aiModeInfo(ai.mode);
    return modalHead("WIND AI") + '<div class="ai-chat">' +
      '<div class="ai-hero">' + aiMascotHtml("ai-3d--lg") + '<div><b class="ai-name">WIND AI</b><small>Kéo hoặc chạm vào robot để xoay 360°</small></div></div>' +
      '<div class="ai-modes" role="tablist" aria-label="Chế độ">' + AI_MODES_UI.map(function (m) {
        return '<button type="button" role="tab" data-action="ai-mode" data-mode="' + m.id + '" aria-selected="' + (m.id === ai.mode) + '" class="ai-chip' + (m.id === ai.mode ? " on" : "") + '">' + m.icon + " " + m.label + "</button>";
      }).join("") + "</div>" +
      '<div id="ai-log" class="ai-log" aria-live="polite">' + aiLogHtml() + "</div>" +
      '<p id="ai-quota" class="ai-quota">' + esc(aiQuotaText()) + "</p>" +
      '<div class="ai-box"><textarea id="ai-input" rows="2" maxlength="' + AI_MAX_LEN + '" placeholder="' + esc(info.hint) + '" data-autofocus>' + esc(ai.draft) + "</textarea>" +
      '<button type="button" id="ai-send" data-action="ai-send" class="ai-send keep-white"' + (ai.busy ? " disabled" : "") + ' aria-label="Gửi">➤</button></div>' +
      '<p class="ai-note">AI có thể sai, hãy kiểm tra lại với giáo trình. Đừng gửi thông tin cá nhân.</p></div>';
  }
  /** Vẽ lại phần thay đổi (tin nhắn, lượt còn lại, nút gửi) mà không làm mất nội dung đang gõ trong ô nhập. */
  function aiPaint() {
    var log = document.getElementById("ai-log"); if (!log) return;
    log.innerHTML = aiLogHtml();
    log.scrollTop = log.scrollHeight;
    var q = document.getElementById("ai-quota"); if (q) q.textContent = aiQuotaText();
    var b = document.getElementById("ai-send"); if (b) b.disabled = ai.busy;
    var inp = document.getElementById("ai-input"); if (inp) inp.placeholder = aiModeInfo(ai.mode).hint;
  }
  function aiOpen(mode) {
    if (mode) ai.mode = aiModeInfo(mode).id;
    else if (ui.tab === "shop") ai.mode = "shop";
    openModal(aiModal);
    aiMascotInit(document.querySelector(".ai-hero"));
    if (isAdmin()) window.WindtpApi.client.admin.aiStats().then(function (s) { ai.stats = s; aiPaint(); }).catch(function () { /* thống kê là phụ */ });
    var log = document.getElementById("ai-log"); if (log) log.scrollTop = log.scrollHeight;
  }
  function aiReady() {
    if (!state.account || !window.WindtpApi) { toast("Hãy đăng nhập để dùng WIND AI"); return false; }
    return true;
  }
  function aiHistory(mode) {
    return aiLog(mode).filter(function (m) { return !m.error; }).slice(-AI_MAX_HISTORY).map(function (m) { return { role: m.role, content: m.content }; });
  }
  /** Gửi một câu hỏi theo chế độ hiện tại; `extra` ghi đè ngữ cảnh (ví dụ word, lang khi giải thích từ). */
  function aiAsk(text, extra) {
    var info = aiModeInfo(ai.mode), mode = ai.mode, log = aiLog(mode);
    text = String(text || "").trim().slice(0, AI_MAX_LEN);
    if (!text || ai.busy || !aiReady()) return Promise.resolve();
    var req = { mode: mode, context: aiContext(info.word ? Object.assign({ word: text }, extra) : extra) };
    if (!info.word) { req.message = text; req.history = aiHistory(mode); }
    log.push({ role: "user", content: info.word ? (mode === "explain" ? "Giải thích từ: " : "Giải thích ngữ pháp: ") + text : text });
    ai.busy = true; ai.draft = ""; aiPaint();
    var inp = document.getElementById("ai-input"); if (inp) inp.value = "";
    return window.WindtpApi.client.ai(req).then(function (r) {
      log.push({ role: "assistant", content: r.reply, cached: r.cached });
      ai.remaining = r.remaining; ai.limit = r.limit;
    }).catch(function (e) {
      log.push({ role: "assistant", content: (e && e.message) || "WIND AI chưa trả lời được, hãy thử lại.", error: true });
      if (e && e.code === "ai-daily-limit") { ai.remaining = 0; if (ai.limit == null) ai.limit = 0; }
    }).then(function () { ai.busy = false; aiPaint(); });
  }

  Object.assign(actions, {
    "open-ai": function () { if (aiReady()) aiOpen(); },
    "ai-mode": function (el) {
      ai.mode = aiModeInfo(el.dataset.mode).id;
      var inp = document.getElementById("ai-input"); if (inp) ai.draft = inp.value;
      refreshModal();
      var log = document.getElementById("ai-log"); if (log) log.scrollTop = log.scrollHeight;
    },
    "ai-send": function () { var inp = document.getElementById("ai-input"); if (inp) aiAsk(inp.value); },
    /** Nút "Giải thích" trong Tra cứu từ vựng: lấy từ ngoại ngữ (bên nguồn nếu không phải tiếng Việt, ngược lại bên đích). */
    "ai-explain-vocab": function () {
      var from = document.getElementById("vocab-from"), to = document.getElementById("vocab-to"), inp = document.getElementById("vocab-input"), out = document.getElementById("vocab-result");
      if (!from || !to || !inp || !out || !aiReady()) return;
      var foreignFrom = from.value !== "vi", lang = (foreignFrom ? from.value : to.value).split("-")[0];
      var word = (foreignFrom ? inp.value : out.textContent || "").trim().slice(0, 80);
      if (!word) { toast("Hãy tra một từ trước"); return; }
      ai.mode = "explain"; ai.draft = ""; aiOpen("explain");
      aiAsk(word, { lang: lang });
    },
    /** Nút "Hỏi AI về bài này" ở danh sách bài của giáo trình. */
    "ai-ask-lesson": function () { if (aiReady()) { ai.draft = ""; aiOpen("chat"); } }
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.target && ev.target.id === "ai-input" && ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); aiAsk(ev.target.value); }
  });
  document.addEventListener("input", function (ev) { if (ev.target && ev.target.id === "ai-input") ai.draft = ev.target.value; });

  /* Nút nổi: chỉ hiện khi đã đăng nhập (màn đăng nhập đã gỡ khỏi trang) và không che modal đang mở. */
  (function mountFab() {
    var fab = document.createElement("button");
    fab.type = "button"; fab.id = "ai-fab"; fab.className = "ai-fab keep-white"; fab.setAttribute("data-action", "open-ai");
    fab.setAttribute("aria-label", "Mở WIND AI"); fab.hidden = true; fab.innerHTML = aiMascotHtml("ai-3d--fab") + "<small>WIND AI</small>";
    document.body.appendChild(fab);
    aiMascotInit(fab);
    // Kéo để xoay thì không mở chat; chỉ chạm nhẹ mới mở.
    fab.addEventListener("click", function (ev) { if (fab._moved) { fab._moved = false; ev.stopPropagation(); ev.preventDefault(); } }, true);
    var sync = function () { fab.hidden = !(state.account && !document.getElementById("login-gate")); };
    new MutationObserver(sync).observe(document.body, { childList: true });
    sync(); window.setInterval(sync, 2500);
  })();

  /* ===== Linh vật robot xoay 360° theo góc nhìn: kéo để xoay, thả ra có quán tính, thỉnh thoảng tự xoay một vòng =====
     Mỗi mốc là một ảnh robot ở một góc (độ). Góc 210°–330° là các ảnh 150°–30° lật ngang; 30° và 60° là ảnh nội suy từ chính diện sang ngang; giữa hai mốc ảnh được hòa dần
     và thu hẹp nhẹ theo chiều ngang để tạo cảm giác xoay. */
  function aiMascotHtml(cls) {
    AI_MASCOT.forEach(function (src, i) { document.documentElement.style.setProperty("--ai-m" + i, "url(" + src + ")"); });
    var layers = AI_ANCHORS.map(function (a, i) {
      return '<i class="ai-3d-l" style="background-image:var(--ai-m' + a.k + ');' + (a.flip ? "transform:scaleX(-1);" : "") + 'opacity:' + (i === 0 ? 1 : 0) + '"></i>';
    }).join("");
    return '<span class="ai-3d ' + cls + '" role="img" aria-label="Robot WIND AI, kéo để xoay 360 độ" data-yaw="0"><span class="ai-3d-in">' + layers + "</span></span>";
  }
  /** Đặt góc nhìn (0–360°): hòa hai mốc ảnh liền kề và thu hẹp nhẹ khi đang chuyển giữa hai mốc. */
  function aiMascotPaint(host, deg) {
    var a = ((deg % 360) + 360) % 360, n = AI_ANCHORS.length, i = n - 1;
    for (var j = 0; j < n; j++) if (AI_ANCHORS[j].y <= a) i = j;
    var next = (i + 1) % n, y0 = AI_ANCHORS[i].y, y1 = next === 0 ? 360 : AI_ANCHORS[next].y, t = (a - y0) / (y1 - y0);
    var layers = host.querySelectorAll(".ai-3d-l"), inner = host.querySelector(".ai-3d-in");
    for (var k = 0; k < layers.length; k++) layers[k].style.opacity = k === i ? String(1 - t) : k === next ? String(t) : "0";
    inner.style.transform = "scaleX(" + (1 - 0.14 * Math.sin(Math.PI * t)).toFixed(3) + ")";
    host.dataset.yaw = String(Math.round(a));
  }
  function aiMascotInit(root) {
    var host = root && root.querySelector ? root.querySelector(".ai-3d") : null;
    if (!host || host._ai3d) return;
    var st = { ry: 0, v: 0, raf: 0, down: false, moved: false, x0: 0, r0: 0, lastX: 0, lastT: 0 };
    host._ai3d = st;
    var paint = function () { aiMascotPaint(host, st.ry); };
    var stop = function () { if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; } };
    var glide = function () {
      stop();
      var step = function () {
        st.ry += st.v; st.v *= 0.94; paint();
        if (Math.abs(st.v) > 0.15) st.raf = requestAnimationFrame(step); else st.raf = 0;
      };
      st.raf = requestAnimationFrame(step);
    };
    host._spin = function () {
      if (st.down) return;
      stop();
      var from = ((st.ry % 360) + 360) % 360, to = from + 360, t0 = performance.now(), dur = 1600;
      var step = function (now) {
        var k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        st.ry = from + (to - from) * e; paint();
        if (k < 1) st.raf = requestAnimationFrame(step); else { st.raf = 0; st.ry = from; paint(); }
      };
      st.raf = requestAnimationFrame(step);
    };
    var area = root.classList && root.classList.contains("ai-fab") ? root : host;
    area.addEventListener("pointerdown", function (ev) {
      st.down = true; st.moved = false; st.x0 = ev.clientX; st.r0 = st.ry; st.lastX = ev.clientX; st.lastT = performance.now(); st.v = 0; stop();
      try { area.setPointerCapture(ev.pointerId); } catch (e) { }
    });
    area.addEventListener("pointermove", function (ev) {
      if (!st.down) return;
      var dx = ev.clientX - st.x0;
      if (Math.abs(dx) > 6) { st.moved = true; area._moved = true; }
      st.ry = st.r0 - dx * 1.6; paint(); // kéo sang phải: robot quay theo tay
      var now = performance.now(), dt = Math.max(1, now - st.lastT);
      st.v = -(ev.clientX - st.lastX) * 1.6 * 16 / dt; st.lastX = ev.clientX; st.lastT = now;
    });
    var up = function () {
      if (!st.down) return;
      st.down = false;
      if (st.moved) { if (Math.abs(st.v) > 0.5) glide(); } else host._spin();
    };
    area.addEventListener("pointerup", up);
    area.addEventListener("pointercancel", up);
    aiSpinners.push(host);
  }
  // Thỉnh thoảng robot tự xoay một vòng để thu hút sự chú ý (tắt khi người dùng chọn giảm chuyển động).
  if (!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    window.setInterval(function () {
      aiSpinners = aiSpinners.filter(function (h) { return document.body.contains(h); });
      var fab = document.getElementById("ai-fab");
      if (fab && !fab.hidden && fab.querySelector(".ai-3d") && fab.querySelector(".ai-3d")._spin) fab.querySelector(".ai-3d")._spin();
    }, 9000);
  }
