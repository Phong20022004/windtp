  /* ===== v12 ===== */
  function lgLogo() {
    return `<div class="lg-brand" role="img" aria-label="WINDTP">${windLogo(84)}<div class="lg-word" aria-hidden="true">${"WINDTP".split("").map((c, i) => `<span style="--i:${i}">${c}</span>`).join("")}</div><div class="lg-tag">Một nền tảng · Nhiều tiện ích</div></div>`;
  }
  function startSession(acct) {
    const isNew = !localStorage.getItem(ukey(acct.email));
    startSession_(acct);
    if (isNew && !acct.admin) { const r = localStorage.getItem("windtp-ref"); if (r && r !== userId() && !state.referredBy) { state.referredBy = r; commit(); } }
  }
  try { const r = new URLSearchParams(location.search).get("ref"); if (r && /^WIND-[A-Za-z0-9._+-]{1,40}$/.test(r)) localStorage.setItem("windtp-ref", r); } catch (e) { }
  function adminTrash(act, id, label) { return `<button data-action="${act}" data-id="${id}" class="absolute top-2 right-2 z-10 px-2 py-1 rounded-lg bg-rose-600 text-white keep-white text-[11px] font-bold shadow" aria-label="${label}">🗑 Xóa</button>`; }
  function postCard(p) { const h = postCard_(p); return isAdmin() ? `<div class="relative">${h}${adminTrash("admin-del-post", p.id, "Xóa bài đăng")}</div>` : h; }
  function listingCard(l) { const h = listingCard_(l); return isAdmin() ? `<div class="relative">${h}${adminTrash("admin-del-listing", l.id, "Xóa tin đăng")}</div>` : h; }
  Object.assign(actions, {
    "admin-del-post": (el) => { if (!isAdmin() || !confirm("Xóa bài đăng này?")) return; state.posts = state.posts.filter((x) => x.id !== el.dataset.id); commit(); renderCommunity(); toast("Đã xóa bài đăng"); },
    "admin-del-listing": (el) => { if (!isAdmin() || !confirm("Xóa tin đăng này?")) return; state.listings = state.listings.filter((x) => x.id !== el.dataset.id); state.saved = (state.saved || []).filter((x) => x !== el.dataset.id); commit(); renderUtilities(); toast("Đã xóa tin đăng"); }
  });
  if (!state.postsCleared) { state.posts = []; state.listings = []; state.postsCleared = true; save(); }
  function adminSection_old() {
    const a = state.account || {};
    return `<div class="rounded-2xl border border-slate-200 p-3 space-y-2"><p class="font-extrabold text-slate-800">👤 Tài khoản</p>
      <p class="text-[11px] text-slate-600 break-all">${esc(a.email || "")}${isAdmin() ? ' · <b class="text-emerald-600">👑 Máy chủ</b>' : ""}</p>
      ${isAdmin() ? `<div class="grid grid-cols-2 gap-2"><button data-action="open-add-product" class="${btnPrimary}">➕ Đăng sản phẩm</button><button data-action="open-moderation" class="${btnGhost}">🛡️ Kiểm duyệt (${pendingCount()})</button></div>` : ""}
      <button data-action="logout" class="w-full ${btnGhost}">Đăng xuất</button></div>`;
  }
  function addProductModal() {
    return `${modalHead("➕ Đăng sản phẩm")}<div class="p-5 space-y-3 text-xs">
      <div><p class="font-bold text-slate-700 mb-1">Ảnh sản phẩm (từ máy)</p>
        <label class="block cursor-pointer"><div id="pp-prev" class="w-full h-40 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 flex items-center justify-center text-sky-700 font-bold overflow-hidden">${ui.ppImg ? `<img src="${ui.ppImg}" class="w-full h-full object-cover" alt="">` : "📷 Bấm để chọn ảnh"}</div><input id="pp-file" type="file" accept="image/*" class="hidden"></label></div>
      <div><label class="font-bold text-slate-700" for="pp-name">Tên sản phẩm</label><input id="pp-name" maxlength="80" class="${field} mt-1"></div>
      <div class="grid grid-cols-2 gap-2"><div><label class="font-bold text-slate-700" for="pp-price">Giá (VNĐ)</label><input id="pp-price" inputmode="numeric" placeholder="Ví dụ 150000" class="${field} mt-1"></div>
        <div><label class="font-bold text-slate-700" for="pp-cat">Danh mục</label><select id="pp-cat" class="${field} mt-1">${Object.keys(STALLS).map((k) => `<optgroup label="Gian ${STALLS[k].no} · ${STALLS[k].name}">${STALL_SUBS[k].map((sb, i) => `<option value="${k}|${sb}" ${ui.shopCat === k && (ui.shopSub ? ui.shopSub === sb : i === 0) ? "selected" : ""}>${sb}</option>`).join("")}</optgroup>`).join("")}</select></div></div>
      <div><label class="font-bold text-slate-700" for="pp-desc">Thông tin / mô tả</label><textarea id="pp-desc" rows="3" maxlength="200" class="${field} mt-1 resize-none"></textarea></div>
      <div class="grid grid-cols-2 gap-2"><div><label class="font-bold text-slate-700" for="pp-xu">Thưởng WIND Coin khi mua</label><input id="pp-xu" inputmode="numeric" placeholder="0" class="${field} mt-1"></div><div><label class="font-bold text-slate-700" for="pp-chip">Thưởng chip khi mua</label><input id="pp-chip" inputmode="numeric" placeholder="0" class="${field} mt-1"></div></div>
      <p class="text-[11px] text-slate-500">Giá KRW và JPY được quy đổi tự động. Sản phẩm lên cửa hàng ngay khi bấm Đăng.</p>
      <button data-action="pp-submit" class="w-full ${btnPrimary}">Đăng lên cửa hàng</button></div>`;
  }
  function readImage(file, cb) {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 640 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        cb(c.toDataURL("image/jpeg", .8));
      };
      im.onerror = () => toast("Không đọc được ảnh này");
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el && el.id === "pp-file" && el.files && el.files[0]) {
      readImage(el.files[0], (d) => { ui.ppImg = d; const pv = $("#pp-prev"); if (pv) pv.innerHTML = `<img src="${d}" class="w-full h-full object-cover" alt="">`; });
    }
  });

