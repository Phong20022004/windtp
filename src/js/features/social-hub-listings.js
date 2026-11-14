  /* ===== v11: logo, social hub, listing forms, auto dark ===== */
  function windLogo(px) { return `<span class="wd-logo" style="--s:${px}px" role="img" aria-label="WINDTP"><span>风</span></span>`; }
  var ICON_TRANSLATE = `<svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="2" y="4" width="17" height="17" rx="4" fill="#fff" fill-opacity=".95"/><text x="10.5" y="17" text-anchor="middle" font-size="12" font-weight="900" fill="#4f46e5" font-family="Arial">A</text><rect x="13" y="11" width="17" height="17" rx="4" fill="#fde68a"/><text x="21.5" y="24" text-anchor="middle" font-size="12" font-weight="900" fill="#be185d" font-family="Arial">文</text></svg>`;
  var TASK_STYLE = { "t-login": ["🔓", "#38bdf8", "#6366f1"], "t-checkin": ["✅", "#34d399", "#059669"], "t-lessons": ["🧠", "#f472b6", "#a855f7"], "t-post": ["📣", "#fbbf24", "#f97316"], "t-shop": ["🛒", "#60a5fa", "#2563eb"], "t-bigshop": ["💎", "#22d3ee", "#7c3aed"], "t-duel": ["⚔️", "#fb7185", "#be185d"], def: ["⭐", "#34d399", "#0ea5e9"] };
  function hubMine() {
    const keep = ui.friendsOpen; ui.friendsOpen = true; const h = friendsCard(); ui.friendsOpen = keep;
    const inv = [], seen = new Set();
    (state.invited || []).forEach((id) => { const p = FRIEND_DIR.find((x) => x.id === id); if (!p) return; const gid = gameFriendId(p.name); if (!seen.has(gid) && friendStatus(gid) !== "friend") { seen.add(gid); inv.push({ name: p.name, id: p.id }); } });
    reqList().forEach((r) => { if (!r || !r.name) return; const gid = r.id || gameFriendId(r.name); if (!seen.has(gid) && friendStatus(gid) !== "friend") { seen.add(gid); inv.push({ name: r.name, id: "Gửi từ game" }); } });
    return h + (inv.length ? `<div class="glass-card p-3 rounded-2xl mt-3 space-y-2"><p class="text-xs font-extrabold text-slate-700">💌 Lời mời đã gửi</p>${inv.map((p) => `<div class="flex items-center gap-3 text-xs">${avatar(p.name, "w-8 h-8")}<span class="font-bold text-slate-800">${esc(p.name)}</span><span class="text-slate-400 truncate">${esc(p.id)}</span></div>`).join("")}</div>` : "");
  }
  function hubBody() { const t = ui.hubTab || "find"; return t === "mine" ? hubMine() : t === "groups" ? chatCard() : `<div class="space-y-3">${friendCard()}</div>`; }
  function hubHtml() {
    const t = ui.hubTab || "find", tabs = [["find", "🔎", "Tìm bạn bè"], ["mine", "💞", "Bạn của tôi"], ["groups", "💬", "Nhóm"]];
    return `<div class="wd-hub-head">${windLogo(38)}<div><h3 class="font-black text-base text-slate-800">Kết bạn &amp; Nhóm</h3><p class="text-[11px] text-slate-500">Tìm bạn, xem bạn bè và tạo nhóm trong một nơi.</p></div></div>
      <div class="wd-tabs" role="tablist">${tabs.map(([k, i, l]) => `<button role="tab" aria-selected="${k === t}" data-action="hub-tab" data-t="${k}" class="wd-tab ${k === t ? "on" : ""}"><span>${i}</span>${l}</button>`).join("")}</div>
      <div id="hub-body" class="wd-hub-body">${hubBody()}</div>`;
  }
  function refreshFriends() {
    const el = $("#friends-card");
    if (el && ui.tab === "community" && !ui.renderModal) el.innerHTML = friendsCard();
    const hb = $("#hub-body");
    if (hb && ui.tab === "entertainment" && !ui.renderModal && (ui.hubTab === "mine" || ui.hubTab === "groups")) { const h = hubBody(); if (hb.dataset.h !== h) { hb.innerHTML = h; hb.dataset.h = h; } }
    const dc = $("#duel-card");
    if (dc && ui.tab === "entertainment" && !ui.renderModal) { const h = duelCard(); if (dc.dataset.h !== h) { dc.innerHTML = h; dc.dataset.h = h; } }
  }
  /* listing form per category */
  function plStash() { ui.plv = ui.plv || {}; document.querySelectorAll('#modal-host [id^="pl-"]').forEach((e) => { ui.plv[e.id] = e.value; }); }
  function plv(id, d) { const v = (ui.plv || {})[id]; return esc(v === undefined ? (d || "") : v); }
  function postListingModal() {
    const cat = ui.plCat || "market";
    const cats = [["market", "🏷️ Chợ đồ cũ"], ["jobs", "🧑‍💻 Việc làm HS/SV"], ["housing", "🏡 Tìm & nhượng phòng"], ...state.customCats.map((c) => [c.id, esc(c.emoji) + " " + esc(c.name)])];
    const inp = (id, label, ph, def) => `<div><label class="text-xs font-bold text-slate-600" for="${id}">${label}</label><input id="${id}" value="${plv(id, def)}" placeholder="${ph}" maxlength="80" class="${field} mt-1"></div>`;
    const cur = (ui.plv || {})["pl-region"] || "";
    let sp;
    if (cat === "jobs") sp = `<div class="grid grid-cols-2 gap-2">${inp("pl-salary", "Mức lương", "VD 28,000 VNĐ / giờ")}${inp("pl-time", "Thời gian làm việc", "VD Ca tối 17h–22h")}</div>`;
    else if (cat === "housing") sp = `<div class="grid grid-cols-2 gap-2">${inp("pl-deposit", "Tiền cọc", "VD 3,000,000 VNĐ")}${inp("pl-rent", "Tiền nhà hàng tháng", "VD 3,200,000 VNĐ")}</div>${inp("pl-fees", "Tiền điện nước, quản lý (nếu có)", "VD Điện 3,500đ/số, nước 100,000đ/người")}`;
    else sp = inp("pl-price", "Giá", "VD 2,000,000 VNĐ");
    return `${modalHead("📝 Đăng tin mới")}<div class="p-5 space-y-3">
      <div class="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">${cats.map(([k, l]) => `<button data-action="pl-cat" data-c="${k}" class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${k === cat ? "bg-teal-600 text-white keep-white" : "bg-slate-100 text-slate-700"}">${l}</button>`).join("")}</div>
      ${inp("pl-title", "Tiêu đề (tối thiểu 5 ký tự)", "")}
      <div class="grid grid-cols-2 gap-2">${inp("pl-country", "Quốc gia", "Ví dụ: Việt Nam, Vietnam, Japan")}<div><label class="text-xs font-bold text-slate-600" for="pl-region">Tên miền</label><select id="pl-region" class="${field} mt-1"><option value="">Chọn miền</option>${REGION_OPTS.slice(1).map((r) => `<option value="${r[0]}" ${cur === r[0] ? "selected" : ""}>${r[1]}</option>`).join("")}</select></div></div>
      ${inp("pl-addr", "Địa chỉ chi tiết", "Số nhà, đường, quận/huyện, thành phố")}
      <p class="text-[10px] text-amber-700 -mt-1">⚠️ Tin đăng được hiển thị công khai cho mọi người dùng. Chỉ ghi địa chỉ nơi gặp mặt hoặc khu vực bạn sẵn sàng công khai (không ghi nhà riêng nếu không cần).</p>
      ${sp}
      <div class="rounded-xl border border-teal-200 bg-teal-50/50 p-3 space-y-2">
        <p class="text-[11px] font-extrabold text-teal-800">Cách liên hệ (tùy chọn)</p>
        <div class="grid grid-cols-2 gap-2">${inp("pl-phone", "Số điện thoại", "VD 0901 234 567")}${inp("pl-zalo", "Zalo (số điện thoại)", "VD 0901 234 567")}</div>
        <div><label class="text-xs font-bold text-slate-600" for="pl-facebook">Facebook</label><input id="pl-facebook" value="${plv("pl-facebook")}" placeholder="Đường dẫn trang cá nhân hoặc tên tài khoản" maxlength="200" class="${field} mt-1"></div>
        <p class="text-[10px] text-slate-500">Người xem còn liên hệ được bạn bằng tin nhắn trực tiếp ngay trên WINDTP (mua hàng, ứng tuyển, hỏi thuê...). Mọi người dùng đã đăng nhập đều xem được thông tin này, nên chỉ nhập số bạn sẵn sàng công khai.</p>
      </div>
      <div><label class="text-xs font-bold text-slate-600" for="pl-desc">Mô tả</label><textarea id="pl-desc" rows="3" maxlength="400" class="${field} mt-1 resize-none">${plv("pl-desc")}</textarea></div>
      <button data-action="submit-listing" class="w-full ${btnPrimary}">Đăng tin</button></div>`;
  }
  const _opl = actions["open-post-listing"];
  Object.assign(actions, {
    "hub-tab": (el) => { ui.hubTab = el.dataset.t ?? "find"; renderEntertainment(); },
    "open-post-listing": (el) => { ui.plv = null; ui.plCat = ["market", "jobs", "housing"].includes(ui.utilCat) ? ui.utilCat : "market"; _opl(el); },
    "pl-cat": (el) => { plStash(); ui.plCat = el.dataset.c ?? "market"; refreshModal(); },
    "submit-listing": () => {
      plStash(); const v = ui.plv || {}, g = (k) => (v[k] || "").trim(); let cat = ui.plCat || "market";
      if (!LISTING_EMOJI[cat] && !state.customCats.some((c) => c.id === cat)) cat = "market";
      const no = (c, m) => { if (c) toast(m); return c; };
      const title = g("pl-title"), country = g("pl-country"), region = g("pl-region"), addr = g("pl-addr");
      if (no(title.length < 5, "Tiêu đề cần tối thiểu 5 ký tự") || no(!country, "Vui lòng nhập quốc gia") || no(!region, "Vui lòng chọn miền") || no(addr.length < 5, "Vui lòng nhập địa chỉ chi tiết")) return;
      const phone = g("pl-phone"), zalo = g("pl-zalo"), facebook = g("pl-facebook");
      const okPhone = (x) => !x || /^\+?\d{8,15}$/.test(x.replace(/[\s.()-]/g, ""));
      const okFb = (x) => { if (!x || /^[A-Za-z0-9.]{5,50}$/.test(x)) return true; try { const u = new URL(x); return (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password && ["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.com", "www.fb.com", "fb.me", "m.me"].includes(u.hostname.toLowerCase()); } catch (e) { return false; } };
      if (no(!okPhone(phone), "Số điện thoại gồm 8–15 chữ số") || no(!okPhone(zalo), "Zalo nhập bằng số điện thoại 8–15 chữ số") || no(!okFb(facebook), "Facebook: dán đường dẫn facebook.com / fb.com / m.me hoặc nhập tên tài khoản")) return;
      let price = "", extra = [];
      if (cat === "jobs") { if (no(!g("pl-salary"), "Vui lòng nhập mức lương") || no(!g("pl-time"), "Vui lòng nhập thời gian làm việc")) return; price = g("pl-salary"); extra.push("Thời gian làm việc: " + g("pl-time")); }
      else if (cat === "housing") { if (no(!g("pl-deposit"), "Vui lòng nhập tiền cọc") || no(!g("pl-rent"), "Vui lòng nhập tiền nhà hàng tháng")) return; price = g("pl-rent") + " / tháng"; extra.push("Tiền cọc: " + g("pl-deposit")); extra.push("Tiền nhà: " + g("pl-rent") + " / tháng"); if (g("pl-fees")) extra.push("Điện nước, quản lý: " + g("pl-fees")); }
      else { if (no(!g("pl-price"), "Vui lòng nhập giá")) return; price = g("pl-price"); }
      const rn = (REGION_OPTS.find((r) => r[0] === region) || [0, region])[1];
      extra.push("Địa chỉ: " + addr + " · " + rn + " · " + country);
      const l = { id: uid("l"), cat, title, price, loc: addr + ", " + rn, country, region, addr, sid: userId(), ts: Date.now(), desc: extra.join(" | ") + "\n" + (g("pl-desc") || "Chưa có mô tả chi tiết."), seller: state.userName, phone, zalo, facebook, emoji: LISTING_EMOJI[cat] ?? state.customCats.find((c) => c.id === cat)?.emoji ?? "📌", status: "pending" };
      state.listings.unshift(l); ui.plv = null; ui.plCat = null; ui.utilCat = cat;
      commit(); closeModal(); toast("Tin đăng đã gửi và đang chờ chủ quản kiểm duyệt trước khi hiển thị.");
    }
  });
  /* auto dark mode from 19:00 (smooth) */
  function autoDarkTick() {
    const st = state.settings; if (st.autoDark === undefined) st.autoDark = true; if (!st.autoDark) return;
    const d = new Date(), hr = d.getHours();
    if (hr >= 7 && hr < 19) { const dayL = d.toDateString(); if (st.autoLightDay === dayL) return; st.autoLightDay = dayL;
      if (st.dark) { st.dark = false; const h0 = document.documentElement; h0.classList.add("theme-fade"); applyTheme(); setTimeout(() => h0.classList.remove("theme-fade"), 3200); }
      commit(); return; }
    if (hr < 19) return;
    const day = d.toDateString(); if (st.autoDarkDay === day) return;
    st.autoDarkDay = day;
    if (!st.dark) { st.dark = true; const h = document.documentElement; h.classList.add("theme-fade"); applyTheme(); setTimeout(() => h.classList.remove("theme-fade"), 3200); }
    commit();
  }
  autoDarkTick(); setInterval(autoDarkTick, 30000);

