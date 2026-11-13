  // ===== Quản trị BigBoss (quyền admin lấy từ custom claim của Firebase, xem src/auth) =====
  var EXPIRE_MS = 7 * 864e5;
  function purgeExpired() {
    const cut = Date.now() - EXPIRE_MS, old = (x) => x && typeof x.ts === "number" && x.ts < cut;
    let n = 0;
    const keep = (arr) => { if (!Array.isArray(arr)) return arr; const out = arr.filter((x) => !old(x)); n += arr.length - out.length; return out; };
    state.posts = keep(state.posts);
    state.listings = keep(state.listings);
    if (Array.isArray(state.listings) && Array.isArray(state.saved)) state.saved = state.saved.filter((id) => state.listings.some((l) => l.id === id));
    if (state.social && state.social.msgs && typeof state.social.msgs === "object") Object.keys(state.social.msgs).forEach((k) => { state.social.msgs[k] = keep(state.social.msgs[k]); });
    return n;
  }
  function ensureIdentity() {
    if (!Array.isArray(state.customProducts)) state.customProducts = [];
    state.customProducts = state.customProducts.filter((p) => p && p.sub);
    if (state.cart && typeof state.cart === "object") { const ok = new Set(state.customProducts.map((p) => p.id).concat(PRODUCTS.filter((p) => !p.custom).map((p) => p.id))); Object.keys(state.cart).forEach((id) => { if (!ok.has(id)) delete state.cart[id]; }); }
    delete state.users; // bảng người dùng cục bộ cũ (có hash mật khẩu) đã bỏ: xác thực nay do Firebase đảm nhiệm
    save();
  }
  function hiddenProd(id) { return (state.hiddenProducts || []).includes(id); }
  function syncCustomProducts() {
    if (!window.__builtinProducts) window.__builtinProducts = PRODUCTS.filter((p) => !p.custom);
    PRODUCTS.length = 0;
    window.__builtinProducts.forEach((p) => { if (hiddenProd(p.id)) return; const ed = (state.productEdits || {})[p.id]; PRODUCTS.push(ed ? Object.assign({}, p, ed, { price: Object.assign({}, p.price, ed.price || {}) }) : p); });
    (state.customProducts || []).slice().reverse().forEach((p) => PRODUCTS.unshift(p));
  }
  // Quyền admin chỉ đến từ custom claim `admin` trong ID token do Firebase ký; không đọc từ localStorage nên không thể tự gán bằng DevTools.
  function isAdmin() { return !!(state.account && window.WindtpAuth.isAdmin()); }
  var LG_CSS = "#login-gate{position:fixed;inset:0;z-index:10000;overflow:auto;background:linear-gradient(160deg,#f4f8fc,#eaf2f9);font-family:Inter,Roboto,Arial,sans-serif;color:#111827}#login-gate .lg-bg{position:fixed;inset:0;pointer-events:none}#login-gate .lg-wrap{position:relative;min-height:100%;display:flex;align-items:center;justify-content:center;padding:20px 14px}#login-gate .lg-card{width:100%;max-width:400px;background:#fff;border:1px solid #e3e9f1;border-radius:18px;padding:24px 24px 20px;box-shadow:0 14px 40px rgba(30,64,120,.12)}#login-gate .lg-logo{display:block;margin:0 auto 6px;width:190px;height:auto}#login-gate h1{text-align:center;font-size:23px;font-weight:700;margin:4px 0 2px}#login-gate .lg-sub{text-align:center;font-size:14px;color:#374151;margin-bottom:14px}#login-gate label.lg-l{display:block;font-size:13px;font-weight:600;color:#1f2937;margin:0 0 4px}#login-gate input[type=text],#login-gate input[type=password],#login-gate input[type=email]{width:100%;height:40px;border:1px solid #d3dbe6;border-radius:8px;padding:0 12px;font-size:14px;background:#fff;color:#111827;outline:none;box-sizing:border-box}#login-gate input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.18)}#login-gate .lg-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}#login-gate .lg-g1{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:10px}#login-gate .lg-field{margin-bottom:10px}#login-gate .lg-g2 .lg-field,#login-gate .lg-g1 .lg-field{margin-bottom:0}#login-gate .lg-pw{position:relative}#login-gate .lg-pw input{padding-right:34px}#login-gate .lg-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:0;cursor:pointer;font-size:15px;opacity:.55;padding:2px 4px}#login-gate .lg-check{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;line-height:1.35;margin:4px 0 12px;color:#1f2937}#login-gate .lg-check input{margin-top:3px;width:16px;height:16px;accent-color:#2563eb;flex:0 0 auto}#login-gate .lg-a{color:#1d5f8a;cursor:pointer;background:none;border:0;padding:0;font:inherit;text-decoration:none}#login-gate .lg-a:hover{text-decoration:underline}#login-gate .lg-submit{width:100%;height:42px;border:0;border-radius:8px;color:#fff;font-weight:700;letter-spacing:.08em;font-size:14px;cursor:pointer;background:linear-gradient(90deg,#2bb3c9,#3b82f6);box-shadow:0 4px 12px rgba(59,130,246,.3)}#login-gate .lg-submit:active{transform:translateY(1px)}#login-gate .lg-meta{display:flex;justify-content:space-between;align-items:center;font-size:13px;margin:12px 0 6px}#login-gate .lg-meta label{display:flex;gap:7px;align-items:center;cursor:pointer}#login-gate .lg-or{display:flex;align-items:center;gap:10px;color:#6b7280;font-size:13px;margin:8px 0}#login-gate .lg-or:before,#login-gate .lg-or:after{content:'';flex:1;height:1px;background:#e3e9f1}#login-gate .lg-google{width:100%;height:42px;border:1px solid #d3dbe6;border-radius:8px;background:#fff;display:flex;gap:10px;align-items:center;justify-content:center;font-size:14px;font-weight:500;cursor:pointer;color:#111827}#login-gate .lg-google:hover{background:#f8fafc}#login-gate .lg-gp{margin-top:10px;padding:12px;border:1px dashed #bcd0e6;border-radius:10px;background:#f6faff}#login-gate .lg-err{display:none;font-size:13px;font-weight:600;color:#dc2626;margin:0 0 10px}#login-gate .lg-switch{text-align:center;font-size:14px;margin:12px 0 0}@media(max-width:380px){#login-gate .lg-card{padding:20px 16px}}";
  function lgLogo() {
    return `<svg class="lg-logo" viewBox="0 0 220 84" role="img" aria-label="WINDTP"><defs><linearGradient id="lgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e4fa8"/><stop offset="1" stop-color="#27a3d9"/></linearGradient><linearGradient id="lgB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1d4ed8"/><stop offset=".7" stop-color="#2a9fd8"/><stop offset="1" stop-color="#3bb4c4"/></linearGradient></defs>
      <path d="M92 38 C108 6 150 4 168 22 C150 18 134 24 128 36 C146 30 164 36 170 48 C152 40 138 44 132 52" fill="none" stroke="url(#lgA)" stroke-width="5" stroke-linecap="round"/>
      <path d="M150 26 C158 10 176 8 186 18 C176 18 170 24 168 30" fill="none" stroke="#3bb4c4" stroke-width="3.5" stroke-linecap="round"/>
      <text x="48" y="56" font-size="54" font-weight="900" font-family="'Noto Serif SC','Songti SC',SimSun,serif" fill="url(#lgA)">风</text>
      <text x="14" y="78" font-size="30" font-weight="900" font-style="italic" font-family="Inter,Arial,sans-serif" fill="url(#lgB)" letter-spacing="1">WINDTP</text>
      <path d="M150 64 C170 56 190 58 206 52 C192 64 172 70 150 68Z" fill="#f59e0b" opacity=".85"/></svg>`;
  }
  /** Màn đăng nhập tự sáng/tối: tối khi Dark Mode trong Cài đặt đang bật, hoặc khi hệ điều hành đang ở chế độ tối; tự cập nhật khi đổi. */
  function lgAutoTheme(d) {
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    const apply = () => d.classList.toggle("lg-dark", document.documentElement.classList.contains("dark") || !!(mq && mq.matches));
    apply();
    let mo = null;
    try { mo = new MutationObserver(apply); mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }); } catch (e) { }
    if (mq) { if (mq.addEventListener) mq.addEventListener("change", apply); else if (mq.addListener) mq.addListener(apply); }
    const watch = new MutationObserver(() => { if (!d.isConnected) { if (mo) mo.disconnect(); if (mq) { if (mq.removeEventListener) mq.removeEventListener("change", apply); else if (mq.removeListener) mq.removeListener(apply); } watch.disconnect(); } });
    watch.observe(document.body, { childList: true });
  }
  function lgBg() {
    return `<svg class="lg-bg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M-40 520 C120 380 300 420 420 520 C300 470 180 500 120 640 Z" fill="#cfe3f5" opacity=".6"/><path d="M-60 600 C100 500 260 540 360 640 C240 600 140 620 80 720 Z" fill="#f8d9b8" opacity=".55"/><path d="M1040 120 C900 40 760 80 700 200 C780 130 900 130 960 240 Z" fill="#cfe3f5" opacity=".6"/><path d="M1060 260 C940 200 820 240 780 340 C860 290 940 300 990 380 Z" fill="#f8d9b8" opacity=".5"/><path d="M1040 520 C920 460 800 500 760 600 C840 540 940 560 1000 660 Z" fill="#cfe3f5" opacity=".5"/></svg>`;
  }
  function publicAccount(acct) { return { uid: acct.uid, email: acct.email, name: acct.name, admin: acct.admin === true }; }
  function startSession_(acct) {
    const nm = String(acct.name || String(acct.email).split("@")[0]).slice(0, 30), keep = {};
    SHARED.forEach((k) => { if (state[k] !== undefined) keep[k] = state[k]; });
    let mine = null; try { mine = JSON.parse(localStorage.getItem(ukey(acct.email)) || "null"); } catch (e) { }
    Object.keys(state).forEach((k) => { if (!SHARED.includes(k)) delete state[k]; });
    const base = seed();
    Object.assign(state, base, mine || { userName: acct.admin ? "BigBoss WINDTP" : nm }, keep, { version: VERSION, settings: { ...base.settings, ...(mine && mine.settings) }, daily: { ...base.daily, ...(mine && mine.daily) } });
    scrubEconomy(state);
    state.account = publicAccount(acct);
    commit();
    econBoot(true);
  }
  function localSignOut() {
    econReset();
    save();
    const keep = {}; SHARED.forEach((k) => { if (state[k] !== undefined) keep[k] = state[k]; });
    Object.keys(state).forEach((k) => { if (!SHARED.includes(k)) delete state[k]; });
    Object.assign(state, seed(), keep, { account: null });
    commit(); closeModal(); showLogin();
  }
  // Khởi động xác thực: phiên chỉ được tin khi Firebase đã xác nhận; state.account trong localStorage chỉ để dựng giao diện tạm.
  function bootAuth() {
    const auth = window.WindtpAuth;
    if (!state.account) showLogin();
    auth.ready.then((acct) => {
      if (!acct) { if (state.account) localSignOut(); return; }
      if (state.account && state.account.email === acct.email) { state.account = publicAccount(acct); commit(); econBoot(); return; }
      if (state.account) save();
      const gate = document.getElementById("login-gate"); if (gate) gate.remove();
      startSession(acct);
    });
    auth.onChange((acct) => {
      if (!auth.isSettled() || !state.account) return;
      if (!acct) { localSignOut(); return; }
      if (acct.email === state.account.email && acct.admin !== state.account.admin) { state.account.admin = acct.admin; commit(); }
    });
  }
  function showLogin() {
    if (document.getElementById("login-gate")) return;
    if (!document.getElementById("lg-style")) { const st = document.createElement("style"); st.id = "lg-style"; st.textContent = LG_CSS; document.head.appendChild(st); }
    const eye = (id) => `<button type="button" class="lg-eye" data-eye="${id}" aria-label="Hiện/ẩn mật khẩu">👁️</button>`;
    const d = document.createElement("div");
    d.id = "login-gate";
    d.innerHTML = `${lgBg()}<div class="lg-wrap"><form id="lg-form" class="lg-card" novalidate>${lgLogo()}
      <h1 id="lg-title"></h1><p class="lg-sub" id="lg-sub"></p>
      <div class="lg-g1" data-m="register"><div class="lg-field"><label class="lg-l" for="lg-name">Họ và tên</label><input id="lg-name" type="text" maxlength="30" autocomplete="name" placeholder="Nguyễn Văn A"></div></div>
      <div class="lg-field"><label class="lg-l" for="lg-email" id="lg-email-l">Email</label><input id="lg-email" type="text" inputmode="email" autocomplete="email" placeholder="example@email.com"></div>
      <div id="lg-pwgrid" class="lg-g2"><div class="lg-field"><label class="lg-l" for="lg-pw" id="lg-pw-l">Mật khẩu</label><div class="lg-pw"><input id="lg-pw" type="password" autocomplete="new-password" placeholder="••••••••">${eye("lg-pw")}</div></div>
        <div class="lg-field" data-m="register forgot"><label class="lg-l" for="lg-pw2">Xác nhận mật khẩu</label><div class="lg-pw"><input id="lg-pw2" type="password" autocomplete="new-password" placeholder="••••••••">${eye("lg-pw2")}</div></div></div>
      <label class="lg-check" data-m="register"><input id="lg-terms" type="checkbox" checked><span>Tôi đồng ý với <button type="button" class="lg-a" data-info="Điều khoản sử dụng: WINDTP dùng cho mục đích học tập, không đăng nội dung vi phạm.">Điều khoản sử dụng</button> và <button type="button" class="lg-a" data-info="Chính sách bảo mật: dữ liệu của bạn chỉ lưu trong trình duyệt này.">Chính sách bảo mật</button>.</span></label>
      <p class="lg-err" id="lg-err" role="alert"></p>
      <button type="submit" class="lg-submit" id="lg-submit"></button>
      <div class="lg-meta" data-m="register login"><label><input id="lg-remember" type="checkbox"> Ghi nhớ đăng nhập</label><button type="button" class="lg-a" id="lg-forgot">Quên mật khẩu?</button></div>
      <div class="lg-or" data-m="register login"><span>hoặc</span></div>
      <button type="button" class="lg-google" id="lg-google" data-m="register login"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Tiếp tục với Google</button>
      <p class="lg-switch" id="lg-switch"></p></form></div>`;
    document.body.appendChild(d);
    lgAutoTheme(d);
    const q = (id) => d.querySelector("#" + id), err = q("lg-err");
    const showErr = (m) => { err.textContent = m; err.style.display = m ? "block" : "none"; };
    let mode = "register";
    const T = {
      register: { t: "Tạo tài khoản WINDTP", s: "Tham gia và khám phá WINDTP", b: "ĐĂNG KÝ", sw: 'Đã có tài khoản? <button type="button" class="lg-a" data-mode="login">Đăng nhập ngay</button>', el: "Email", ph: "example@email.com" },
      login: { t: "Đăng nhập WINDTP", s: "Chào mừng bạn quay lại", b: "ĐĂNG NHẬP", sw: 'Chưa có tài khoản? <button type="button" class="lg-a" data-mode="register">Đăng ký</button>', el: "Email", ph: "example@email.com" },
      forgot: { t: "Đặt lại mật khẩu", s: "Nhập email để nhận liên kết đặt lại mật khẩu", b: "GỬI LIÊN KẾT", sw: '<button type="button" class="lg-a" data-mode="login">← Quay lại đăng nhập</button>', el: "Email", ph: "example@email.com" }
    };
    const setMode = (m) => {
      mode = m; const c = T[m];
      q("lg-title").textContent = c.t; q("lg-sub").textContent = c.s; q("lg-submit").textContent = c.b; q("lg-switch").innerHTML = c.sw;
      q("lg-email-l").textContent = c.el; q("lg-email").placeholder = c.ph;
      d.querySelectorAll("[data-m]").forEach((el) => { el.style.display = el.dataset.m.split(" ").includes(m) ? "" : "none"; });
      q("lg-pwgrid").className = m === "login" ? "lg-g1" : "lg-g2";
      q("lg-pwgrid").style.display = m === "forgot" ? "none" : "";
      q("lg-pw").autocomplete = m === "login" ? "current-password" : "new-password";
      showErr("");
    };
    setMode("register");
    d.addEventListener("click", (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.dataset.mode) { setMode(t.dataset.mode); return; }
      if (t.dataset.eye) { const i = q(t.dataset.eye); i.type = i.type === "password" ? "text" : "password"; return; }
      if (t.dataset.info) { toast(t.dataset.info); return; }
      if (t.id === "lg-forgot") { setMode("forgot"); return; }
      if (t.id === "lg-google") { googleSignIn(); return; }
    });
    const auth = window.WindtpAuth;
    let busy = false;
    const setBusy = (on) => { busy = on; q("lg-submit").disabled = on; q("lg-google").disabled = on; };
    const enter = (acct) => {
      startSession(acct);
      d.remove();
      toast(acct.admin ? "👑 Đăng nhập giao diện máy chủ" : "Xin chào " + acct.name + "!");
    };
    const run = async (task) => {
      if (busy) return;
      showErr(""); setBusy(true);
      try { await task(); } catch (e) { showErr(e && e.message ? e.message : "Có lỗi xảy ra, vui lòng thử lại"); } finally { setBusy(false); }
    };
    const googleSignIn = () => run(async () => enter(await auth.loginWithGoogle(q("lg-remember").checked)));
    q("lg-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = q("lg-email").value, pw = q("lg-pw").value, remember = q("lg-remember").checked;
      if (mode === "register") {
        if (!q("lg-terms").checked) { showErr("Bạn cần đồng ý Điều khoản sử dụng và Chính sách bảo mật"); return; }
        run(async () => enter(await auth.register({ name: q("lg-name").value, email, password: pw, confirm: q("lg-pw2").value, remember })));
        return;
      }
      if (mode === "login") { run(async () => enter(await auth.login({ email, password: pw, remember }))); return; }
      run(async () => {
        await auth.requestPasswordReset(email);
        toast("Nếu email đã đăng ký, liên kết đặt lại mật khẩu đã được gửi.");
        q("lg-pw").value = ""; q("lg-pw2").value = ""; setMode("login");
      });
    });
    window.setTimeout(() => q("lg-name").focus(), 50);
  }
  function pendingCount() { return state.posts.filter((p) => p.status === "pending").length + state.listings.filter((l) => l.status === "pending").length; }
  function modCard() {
    const n = pendingCount();
    return `<div class="glass-card rounded-2xl p-4 border border-rose-200 bg-rose-50/70"><div class="flex items-center justify-between gap-3"><div><h3 class="text-sm font-extrabold text-slate-800">🛡️ Kiểm duyệt nội dung ${n ? `<span class="ml-1 text-[10px] font-extrabold bg-rose-600 text-white keep-white rounded-full px-1.5 py-0.5">${n} chờ duyệt</span>` : ""}</h3><p class="text-[11px] text-slate-600 mt-1">Chỉ bạn (BigBoss) thấy khu này. Bài cộng đồng và tin tiện ích của người dùng khác chỉ hiện công khai khi bạn bấm Duyệt.</p></div><button data-action="open-moderation" class="px-3 py-2 rounded-xl text-xs font-extrabold bg-rose-600 text-white keep-white whitespace-nowrap">Mở kiểm duyệt</button></div></div>`;
  }
  function ownPendingNote() {
    const n = state.posts.filter((p) => p.status === "pending" && p.author === state.userName).length;
    return n ? `<p class="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">⏳ Bạn có ${n} bài đang chờ BigBoss duyệt.</p>` : "";
  }

