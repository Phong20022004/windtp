  /* ===== v10: geo search (country EN/VI + Bắc/Trung/Nam/Đông/Tây) ===== */
  var REGION_OPTS = [["", "Tất cả các miền"], ["Bắc", "Miền Bắc"], ["Trung", "Miền Trung"], ["Nam", "Miền Nam"], ["Đông", "Miền Đông"], ["Tây", "Miền Tây"]];
  var COUNTRY_ALIASES = {
    vn: ["viet nam", "vietnam", "vn", "viet"], kr: ["han quoc", "korea", "south korea", "hanguk", "kr", "han"], jp: ["nhat ban", "nhat", "japan", "jp"],
    us: ["my", "hoa ky", "united states", "usa", "america", "us"], uk: ["anh", "vuong quoc anh", "united kingdom", "england", "uk", "britain"],
    cn: ["trung quoc", "china", "cn"], th: ["thai lan", "thailand", "th"], sg: ["singapore", "sg"], tw: ["dai loan", "taiwan", "tw"],
    au: ["uc", "australia", "au"], fr: ["phap", "france", "fr"], de: ["duc", "germany", "de"], ca: ["canada", "ca"], la: ["lao", "laos"], kh: ["campuchia", "cambodia", "kh"]
  };
  function countryKey(t) {
    const n = norm(t || ""); if (!n) return "";
    for (const k in COUNTRY_ALIASES) if (COUNTRY_ALIASES[k].includes(n)) return k;
    for (const k in COUNTRY_ALIASES) if (COUNTRY_ALIASES[k].some((a) => a.length > 3 && (n.includes(a) || a.includes(n)))) return k;
    return "";
  }
  function geoCountryMatch(itemCountry, query) {
    const qk = countryKey(query), ik = countryKey(itemCountry);
    if (qk || ik) return qk === ik;
    return norm(itemCountry || "").includes(norm(query || ""));
  }
  function regionSelect(id, cur) { return `<select id="${id}" aria-label="Miền" class="${field}">${REGION_OPTS.map((r) => `<option value="${r[0]}" ${cur === r[0] ? "selected" : ""}>${r[1]}</option>`).join("")}</select>`; }
  function listingGeo(l) {
    const t = norm((l.loc || "") + " " + (l.country || "")); let region = l.region || "";
    if (!region) {
      if (/ha noi|hai phong|quang ninh|bac ninh/.test(t)) region = "Bắc";
      else if (/da nang|hue|nghe an|quang nam|nha trang/.test(t)) region = "Trung";
      else if (/ho chi minh|hcm|sai gon|thu duc|binh duong/.test(t)) region = "Nam";
      else if (/can tho|ca mau|an giang|tien giang/.test(t)) region = "Tây";
      else if (/bien hoa|dong nai|vung tau/.test(t)) region = "Đông";
    }
    return { country: l.country || "Việt Nam", region };
  }
  function utilGeoOk(l) {
    const f = ui.ug; if (!f) return true; const g = listingGeo(l);
    if (f.country && !geoCountryMatch(g.country, f.country)) return false;
    if (f.region && g.region !== f.region) return false;
    if (f.q) { const q = norm(f.q).replace(/^wind-?/, ""), hay = norm((l.title || "") + " " + (l.seller || "") + " " + (l.sid || "") + " " + (l.loc || "")).replace(/wind-/g, ""); if (!hay.includes(q)) return false; }
    return true;
  }
  function utilSearchBar() {
    const f = ui.ug || { q: "", country: "", region: "" };
    return `<div class="glass-card p-3 rounded-2xl space-y-2 text-xs"><p class="font-extrabold text-slate-800">🔎 Tìm theo ID, từ khóa hoặc nơi ở</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2"><input id="ug-q" value="${esc(f.q || "")}" placeholder="Từ khóa hoặc ID người đăng" aria-label="Từ khóa" class="${field}"><input id="ug-country" value="${esc(f.country || "")}" placeholder="Tên nước (Việt Nam / Japan…)" aria-label="Quốc gia" class="${field}">${regionSelect("ug-region", f.region)}</div>
      <div class="flex gap-2"><button data-action="ut-geo-run" class="flex-1 ${btnPrimary}">Tìm kiếm</button><button data-action="ut-geo-clear" class="${btnGhost}">Xóa lọc</button></div></div>`;
  }
  var FRIEND_DIR = [
    { id: "WIND-minhanh", name: "Minh Anh", country: "Việt Nam", region: "Bắc", city: "Hà Nội" },
    { id: "WIND-quanghuy", name: "Quang Huy", country: "Việt Nam", region: "Bắc", city: "Hải Phòng" },
    { id: "WIND-thuha", name: "Thu Hà", country: "Việt Nam", region: "Trung", city: "Đà Nẵng" },
    { id: "WIND-baolong", name: "Bảo Long", country: "Việt Nam", region: "Trung", city: "Huế" },
    { id: "WIND-ngocmai", name: "Ngọc Mai", country: "Việt Nam", region: "Nam", city: "TP. Hồ Chí Minh" },
    { id: "WIND-tuankiet", name: "Tuấn Kiệt", country: "Việt Nam", region: "Tây", city: "Cần Thơ" },
    { id: "WIND-hoangnam", name: "Hoàng Nam", country: "Việt Nam", region: "Đông", city: "Biên Hòa" },
    { id: "WIND-jiwoo", name: "Ji-woo", country: "Hàn Quốc", region: "Bắc", city: "Seoul" },
    { id: "WIND-minjun", name: "Min-jun", country: "Hàn Quốc", region: "Nam", city: "Busan" },
    { id: "WIND-haeun", name: "Ha-eun", country: "Hàn Quốc", region: "Trung", city: "Daejeon" },
    { id: "WIND-hanbin", name: "Han-bin", country: "Hàn Quốc", region: "Đông", city: "Gangneung" },
    { id: "WIND-seoyeon", name: "Seo-yeon", country: "Hàn Quốc", region: "Tây", city: "Incheon" },
    { id: "WIND-sakura", name: "Sakura", country: "Nhật Bản", region: "Đông", city: "Tokyo" },
    { id: "WIND-haruto", name: "Haruto", country: "Nhật Bản", region: "Tây", city: "Osaka" },
    { id: "WIND-yuki", name: "Yuki", country: "Nhật Bản", region: "Bắc", city: "Sapporo" },
    { id: "WIND-emily", name: "Emily", country: "Mỹ", region: "Tây", city: "Los Angeles" },
    { id: "WIND-oliver", name: "Oliver", country: "Anh", region: "Bắc", city: "Manchester" }
  ];
  function friendResults() {
    const f = ui.fs; if (!f || !f.done) return "";
    const nq = norm(f.q || "").replace(/^wind-?/, ""), nc = norm(f.country || "");
    const res = FRIEND_DIR.filter((p) => p.id !== userId() && (!nq || norm(p.id).replace(/^wind-?/, "").includes(nq) || norm(p.name).includes(nq)) && (!f.country || geoCountryMatch(p.country, f.country)) && (!f.region || p.region === f.region));
    if (!res.length) return '<p class="text-xs text-slate-500">Chưa tìm thấy bạn phù hợp. Thử đổi ID, quốc gia hoặc miền.</p>';
    return res.map((p) => `<div class="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-100">${avatar(p.name, "w-10 h-10")}<div class="flex-1 min-w-0"><p class="text-xs font-bold text-slate-800">${esc(p.name)}</p><p class="text-[10px] text-slate-500 truncate">${esc(p.id)}</p><p class="text-[10px] text-slate-400 truncate">📍 ${esc(p.city)} · Miền ${esc(p.region)} · ${esc(p.country)}</p></div>${friendStatus(gameFriendId(p.name)) === "friend" ? '<span class="text-[10px] font-bold text-emerald-600">✓ Đã là bạn bè</span>' : (state.invited.includes(p.id) || friendStatus(gameFriendId(p.name))) ? '<span class="text-[10px] font-bold text-emerald-600">Đã gửi lời mời</span>' : `<button data-action="fs-add" data-id="${p.id}" class="px-3 py-1.5 rounded-lg bg-pink-600 text-white keep-white text-[11px] font-bold">Kết bạn</button>`}</div>`).join("");
  }
  function friendCard() {
    const f = ui.fs || { q: "", country: "", region: "", done: false };
    return `<h4 class="font-bold text-sm text-slate-800">Tìm theo ID hoặc nơi ở</h4>
      <p class="text-xs text-slate-500">Nhập ID bạn bè, hoặc nhập tên nước (tiếng Việt hoặc tiếng Anh) và chọn miền Bắc, Trung, Nam, Đông, Tây để tìm bạn bè gần nơi bạn ở.</p>
      <div class="grid grid-cols-1 gap-2 text-xs">
        <input id="fs-q" value="${esc(f.q || "")}" placeholder="ID, ví dụ WIND-minhanh" aria-label="ID bạn bè" class="border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
        <input id="fs-country" value="${esc(f.country || "")}" placeholder="Nơi ở: tên nước (tiếng Việt hoặc Anh), ví dụ Japan / Nhật Bản" aria-label="Quốc gia" class="border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
        <select id="fs-region" aria-label="Miền" class="border border-slate-200 rounded-lg px-2 py-1.5 bg-white">${REGION_OPTS.map((r) => `<option value="${r[0]}" ${f.region === r[0] ? "selected" : ""}>${r[1]}</option>`).join("")}</select>
      </div>
      <button data-action="fs-run" class="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white keep-white rounded-xl text-xs font-bold">Tìm bạn bè</button>
      <div class="space-y-2">${friendResults()}</div>`;
  }
  /* special tasks with proof */
  function proofModal() {
    const t = (state.customTasks || []).find((x) => x.id === ui.proofTask);
    if (!t) return `${modalHead("Nhiệm vụ")}<p class="p-6 text-sm text-slate-500">Không tìm thấy nhiệm vụ.</p>`;
    return `${modalHead("Chứng minh hoàn thành")}<div class="p-5 space-y-3 text-xs"><p class="font-bold text-sm text-slate-800">${esc(t.title)}</p>
      <ol class="list-decimal pl-4 space-y-1 text-slate-600"><li>Chụp màn hình kết quả hoàn thành nhiệm vụ.</li><li>Gửi ảnh về trang Facebook WINDTP kèm ID của bạn: <b>${esc(userId())}</b>.</li><li>Bấm "Tôi đã gửi" để chờ máy chủ xử lý và cộng thưởng.</li></ol>
      <div>${fbContactBtn()}</div><button data-action="ctask-sent" class="w-full ${btnPrimary}">Tôi đã gửi</button></div>`;
  }
  function customTasksHtml() {
    const list = state.customTasks || [], claims = state.taskClaims || [], me = userId(), adm = isAdmin();
    const add = adm ? `<button data-action="open-task-add" class="w-full ${btnPrimary}">➕ Thêm nhiệm vụ</button>` : "";
    if (!list.length) return add ? `<div class="mt-4">${add}</div>` : "";
    const PAL = [["#f472b6", "#a855f7"], ["#fbbf24", "#f97316"], ["#60a5fa", "#2563eb"], ["#22d3ee", "#7c3aed"], ["#fb7185", "#be185d"], ["#34d399", "#0ea5e9"]];
    const items = list.map((t, ti) => {
      const pal = PAL[ti % PAL.length], ico = t.money ? "💵" : t.chips ? "🎰" : "🪙";
      const rw = [t.xu ? `🪙 ${fmt(t.xu)} Xu` : "", t.chips ? `🎰 ${fmt(t.chips)} chip` : "", t.money ? `💵 ${money(t.money, t.cur)}` : ""].filter(Boolean).join(" · ");
      const cl = claims.find((c) => c.uid === me && c.taskId === t.id);
      const act = cl ? (cl.status === "granted" ? '<span class="text-[11px] font-bold text-emerald-600">Đã nhận</span>' : '<span class="text-[11px] font-bold text-amber-600">Đã gửi, chờ xử lý</span>') : `<button data-action="ctask-claim" data-id="${t.id}" class="${btnPrimary}">Hoàn thành</button>`;
      return `<div class="glass-card rounded-2xl p-3.5 flex gap-3 items-center"><div class="w-20 h-20 rounded-2xl wd-tile flex items-center justify-center text-3xl shrink-0" style="--c1:${pal[0]};--c2:${pal[1]}"><span class="wd-tile-i">${ico}</span></div><div class="flex-1 min-w-0"><span class="text-[9px] px-1.5 py-0.5 rounded font-bold" style="background:#ede9fe;color:#5b21b6">Nhiệm Vụ • Đặc biệt</span><h4 class="text-xs font-bold text-slate-800 mt-0.5">${esc(t.title)}</h4><p class="text-xs font-extrabold text-emerald-600">${rw}</p><div class="flex items-center justify-between mt-1.5 gap-2"><span class="text-[10px] text-slate-400 line-clamp-2">${esc(t.desc || "")}</span>${adm ? "" : act}</div></div>${adm ? `<div class="flex flex-col gap-1 shrink-0"><button data-action="task-edit" data-id="${t.id}" class="text-sky-600 text-lg" aria-label="Sửa" title="Sửa nhiệm vụ">✏️</button><button data-action="task-del" data-id="${t.id}" class="text-rose-500 text-lg" aria-label="Xóa">🗑</button></div>` : ""}</div>`;
    }).join("");
    const box = adm ? `<div class="rounded-2xl border border-sky-200 bg-sky-50 p-3 space-y-2 text-xs"><p class="font-extrabold text-sky-900">Duyệt nhiệm vụ đặc biệt</p><p class="text-slate-600">Yêu cầu của người dùng nằm trong danh sách đơn hàng; máy chủ cộng đúng mức thưởng của nhiệm vụ khi bạn xác nhận.</p><button data-action="open-orders" class="w-full ${btnPrimary}">Mở danh sách chờ xử lý</button></div>` : "";
    return `<div class="mt-4 space-y-3"><div class="wd-hero rounded-3xl p-4 text-white keep-white shadow-lg" style="background:linear-gradient(135deg,#8b5cf6,#d946ef 55%,#f59e0b)"><p class="text-[10px] uppercase tracking-wider font-extrabold opacity-90">WINDTP Rewards</p><h3 class="text-xl font-black mt-0.5">Nhiệm vụ đặc biệt</h3><p class="text-xs mt-1 opacity-95">Phần thưởng riêng từ BigBoss: WIND Coin, Chip và tiền thật.</p></div>${add}<div class="grid grid-cols-1 xl:grid-cols-2 gap-3">${items}</div>${box}</div>`;
  }

