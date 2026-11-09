  /* ===== v16: máy chủ (admin) sửa nhiệm vụ & sản phẩm đã đăng ===== */
  function taskEditModal() {
    const t = (state.customTasks || []).find((x) => x.id === ui.editTaskId) || {};
    const cur = t.cur || "VND";
    return `${modalHead("✏️ Sửa nhiệm vụ")}<div class="p-5 space-y-3 text-xs">
      <div><label class="font-bold text-slate-700" for="et-title">Tên nhiệm vụ</label><input id="et-title" maxlength="80" value="${esc(t.title || "")}" class="${field} mt-1"></div>
      <div><label class="font-bold text-slate-700" for="et-desc">Mô tả</label><textarea id="et-desc" rows="2" maxlength="200" class="${field} mt-1 resize-none">${esc(t.desc || "")}</textarea></div>
      <p class="font-bold text-slate-700">Mức thưởng (để 0 nếu không dùng)</p>
      <div class="grid grid-cols-3 gap-2"><div><label class="text-[10px] text-slate-500" for="et-xu">WIND Coin</label><input id="et-xu" inputmode="numeric" value="${t.xu || 0}" class="${field}"></div><div><label class="text-[10px] text-slate-500" for="et-chip">Chip</label><input id="et-chip" inputmode="numeric" value="${t.chips || 0}" class="${field}"></div><div><label class="text-[10px] text-slate-500" for="et-money">Tiền</label><input id="et-money" inputmode="numeric" value="${t.money || 0}" class="${field}"></div></div>
      <select id="et-cur" class="${field}">${["VND", "KRW", "JPY"].map((c) => `<option ${c === cur ? "selected" : ""}>${c}</option>`).join("")}</select>
      <p class="text-[11px] text-slate-500">Thay đổi áp dụng cho các lần nhận thưởng sau. Người đã nhận trước đó không bị ảnh hưởng.</p>
      <button data-action="task-edit-save" class="w-full ${btnPrimary}">Lưu thay đổi</button></div>`;
  }
  function prodEditModal() {
    const id = ui.editProdId, p = PRODUCTS.find((x) => x.id === id), orig = (window.__builtinProducts || []).find((x) => x.id === id);
    if (!p) return `${modalHead("✏️ Sửa sản phẩm")}<div class="p-5 text-xs text-slate-500">Không tìm thấy sản phẩm.</div>`;
    const edited = !!(state.productEdits || {})[id];
    const catSel = p.custom ? `<div><label class="font-bold text-slate-700" for="pe-cat">Danh mục</label><select id="pe-cat" class="${field} mt-1">${Object.keys(STALLS).map((k) => `<optgroup label="Gian ${STALLS[k].no} · ${STALLS[k].name}">${STALL_SUBS[k].map((sb) => `<option value="${k}|${sb}" ${p.cat === k && p.sub === sb ? "selected" : ""}>${sb}</option>`).join("")}</optgroup>`).join("")}</select></div>` : "";
    return `${modalHead("✏️ Sửa sản phẩm")}<div class="p-5 space-y-3 text-xs">
      <div><p class="font-bold text-slate-700 mb-1">Ảnh sản phẩm (bấm để đổi)</p>
        <label class="block cursor-pointer"><div id="pp-prev" class="w-full h-32 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 flex items-center justify-center text-sky-700 font-bold overflow-hidden">${ui.ppImg ? `<img src="${ui.ppImg}" class="w-full h-full object-cover" alt="">` : (p.emoji || "📷")}</div><input id="pp-file" type="file" accept="image/*" class="hidden"></label></div>
      <div><label class="font-bold text-slate-700" for="pe-name">Tên sản phẩm</label><input id="pe-name" maxlength="120" value="${esc(String(p.name || "").replace(/<[^>]*>/g, ""))}" class="${field} mt-1"></div>
      <div><label class="font-bold text-slate-700" for="pe-desc">Thông tin / mô tả</label><textarea id="pe-desc" rows="3" maxlength="300" class="${field} mt-1 resize-none">${esc(String(p.desc || "").replace(/<[^>]*>/g, ""))}</textarea></div>
      <p class="font-bold text-slate-700">Giá bán</p>
      <div class="grid grid-cols-3 gap-2"><div><label class="text-[10px] text-slate-500" for="pe-vnd">VND</label><input id="pe-vnd" inputmode="numeric" value="${p.price.VND}" data-o="${p.price.VND}" class="${field}"></div><div><label class="text-[10px] text-slate-500" for="pe-krw">KRW</label><input id="pe-krw" inputmode="numeric" value="${p.price.KRW}" data-o="${p.price.KRW}" class="${field}"></div><div><label class="text-[10px] text-slate-500" for="pe-jpy">JPY</label><input id="pe-jpy" inputmode="numeric" value="${p.price.JPY}" data-o="${p.price.JPY}" class="${field}"></div></div>
      <p class="text-[11px] text-slate-500">Chỉ đổi VND thì KRW và JPY tự quy đổi theo.</p>
      <div class="grid grid-cols-2 gap-2"><div><label class="font-bold text-slate-700" for="pe-xu">Thưởng WIND Coin khi mua</label><input id="pe-xu" inputmode="numeric" value="${p.rewardXu || 0}" class="${field} mt-1"></div><div><label class="font-bold text-slate-700" for="pe-chip">Thưởng chip khi mua</label><input id="pe-chip" inputmode="numeric" value="${p.rewardChips || 0}" class="${field} mt-1"></div></div>
      ${catSel}
      <button data-action="pp-edit-save" class="w-full ${btnPrimary}">Lưu thay đổi</button>
      ${edited && orig ? `<button data-action="pp-edit-reset" class="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600">↩️ Khôi phục thông tin gốc</button>` : ""}</div>`;
  }
  Object.assign(actions, {
    "task-edit": (el) => { if (!isAdmin()) return; if (!(state.customTasks || []).some((x) => x.id === el.dataset.id)) return; ui.editTaskId = el.dataset.id; openModal(taskEditModal); },
    "task-edit-save": () => {
      if (!isAdmin()) return;
      const t = (state.customTasks || []).find((x) => x.id === ui.editTaskId); if (!t) { toast("Không tìm thấy nhiệm vụ"); return; }
      const title = (val("et-title") || "").trim(), n = (k) => Math.max(0, Math.floor(Number(String(val(k)).replace(/[^\d]/g, "")) || 0));
      const xu = n("et-xu"), chips = n("et-chip"), money = n("et-money");
      if (!title) { toast("Nhập tên nhiệm vụ"); return; }
      if (!xu && !chips && !money) { toast("Nhập ít nhất một mức thưởng"); return; }
      Object.assign(t, { title, desc: (val("et-desc") || "").trim(), xu, chips, money, cur: val("et-cur") || "VND", editedTs: Date.now() });
      (state.taskClaims || []).forEach((c) => { if (c.taskId === t.id && c.status !== "granted") c.title = title; });
      commit(); closeModal(); renderTasks(); toast("✅ Đã cập nhật nhiệm vụ");
    },
    "pp-edit": (el) => {
      if (!isAdmin()) { toast("Chỉ BigBoss mới sửa được sản phẩm."); return; }
      const p = PRODUCTS.find((x) => x.id === el.dataset.id); if (!p) { toast("Không tìm thấy sản phẩm"); return; }
      ui.editProdId = p.id; ui.ppImg = p.img && /^data:/.test(p.img) ? p.img : null; ui.ppImgChanged = false; openModal(prodEditModal);
    },
    "pp-edit-save": () => {
      if (!isAdmin()) return;
      const id = ui.editProdId, p = PRODUCTS.find((x) => x.id === id); if (!p) return;
      const num = (k) => Math.round(Number(String(val(k)).replace(/[^\d]/g, "")) || 0);
      const name = val("pe-name"); if (name.length < 3) { toast("Tên sản phẩm cần tối thiểu 3 ký tự"); return; }
      const vnd = num("pe-vnd"); if (!(vnd > 0)) { toast("Giá VND phải lớn hơn 0"); return; }
      const o = (k) => Number($("#" + k)?.dataset.o || 0);
      let krw = num("pe-krw"), jpy = num("pe-jpy");
      if (vnd !== o("pe-vnd") && krw === o("pe-krw")) krw = Math.max(100, Math.round(vnd / 19 / 100) * 100);
      if (vnd !== o("pe-vnd") && jpy === o("pe-jpy")) jpy = Math.max(10, Math.round(vnd / 160 / 10) * 10);
      if (!(krw > 0) || !(jpy > 0)) { toast("Giá KRW và JPY phải lớn hơn 0"); return; }
      const f = { name, desc: val("pe-desc") || p.desc, price: { VND: vnd, KRW: krw, JPY: jpy }, rewardXu: Math.max(0, Math.floor(Number(val("pe-xu")) || 0)), rewardChips: Math.max(0, Math.floor(Number(val("pe-chip")) || 0)) };
      if (ui.ppImgChanged && ui.ppImg) f.img = ui.ppImg;
      const cs = $("#pe-cat");
      if (p.custom) {
        const cp = (state.customProducts || []).find((x) => x.id === id); if (!cp) return;
        Object.assign(cp, f);
        if (cs) { const [c, sb] = cs.value.split("|"); if (STALLS[c]) { cp.cat = c; cp.sub = sb || ""; cp.emoji = STALLS[c].emoji; } }
      } else {
        state.productEdits = state.productEdits || {};
        state.productEdits[id] = Object.assign({}, state.productEdits[id] || {}, f);
      }
      syncCustomProducts(); ui.ppImg = null; ui.ppImgChanged = false;
      commit(); if (!save()) toast("Bộ nhớ trình duyệt đầy, thay đổi có thể không được lưu");
      closeModal(); renderTab("shop"); toast("✅ Đã cập nhật sản phẩm");
    },
    "pp-edit-reset": () => {
      if (!isAdmin()) return;
      if (!window.confirm("Khôi phục sản phẩm này về thông tin gốc?")) return;
      if (state.productEdits) delete state.productEdits[ui.editProdId];
      syncCustomProducts(); commit(); closeModal(); renderTab("shop"); toast("Đã khôi phục thông tin gốc");
    }
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el && el.id === "pp-file" && ui.editProdId && el.files && el.files[0]) ui.ppImgChanged = true;
  });

