  // ===== v48: dữ liệu người chơi dùng chung (game ↔ WINDTP) + lời mời kết bạn =====
  var FEM_N = ["Hà", "Lan", "Thảo", "Mai", "Linh", "Vy", "Trang", "Ngân", "Yến", "Hân", "Thư", "An"];
  var MAL_N = ["Minh", "Phúc", "Nam", "Hùng", "Tú", "Đạt", "Quân", "Bảo", "Khoa", "Phát", "Duy", "Lộc", "Huy"];
  var REALM_W = [25, 20, 16, 12, 10, 7, 5, 3, 2];
  function nameHash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  var GID_CACHE = new Map();
  function gameFriendId(n) {
    const k = String(n || "").trim().slice(0, 40); let v = GID_CACHE.get(k);
    if (v === undefined) { v = "fr-g-" + nameHash(k).toString(36); if (GID_CACHE.size > 2000) GID_CACHE.clear(); GID_CACHE.set(k, v); }
    return v;
  }
  function givenKey(n) { return norm(String(n || "").trim().split(/\s+/).pop()); }
  function friendByName(name) {
    restoreGameFriends();
    name = String(name || "").trim(); if (!name) return null;
    if (/^fr-/.test(name)) return FRIENDS.find((f) => f.id === name) || FRIENDS.find((f) => gameFriendId(f.name) === name) || null;
    const gid = gameFriendId(name);
    return FRIENDS.find((f) => f.id === gid) || FRIENDS.find((f) => gameFriendId(f.name) === gid) || null;
  }
  function playerInfo(name) {
    name = String(name || "").trim();
    const f = friendByName(name), h = nameHash("wind|" + (f ? f.name : name)), top = Math.min(CULTIVATION_RANKS.length, REALM_W.length);
    const meta = f ? (FRIEND_META[f.id] || []) : [];
    const first = (f ? f.name : name).split(/\s+/).pop();
    const gender = meta[0] || (FEM_N.includes(first) ? "nu" : MAL_N.includes(first) ? "nam" : (h & 1 ? "nu" : "nam"));
    const age = Number(meta[1]) || 18 + ((h >>> 3) % 23);
    let realm;
    if (f) realm = Math.max(0, Math.min(top - 1, Number(f.realm) || 0));
    else { let x = (h >>> 9) % 100; realm = 0; for (let i = 0; i < top; i++) { if (x < REALM_W[i]) { realm = i; break; } x -= REALM_W[i]; } }
    return { name: f ? f.name : name, gender, age, realm, realmName: CULTIVATION_RANKS[realm].name, friend: !!f, friendId: f ? f.id : "" };
  }
  function reqList() { const s = socialState(); if (!Array.isArray(s.friendReq)) s.friendReq = []; return s.friendReq; }
  function friendStatus(name) {
    name = String(name || "").trim(); if (!name) return "";
    if (friendByName(name)) return "friend";
    const gid = /^fr-/.test(name) ? name : gameFriendId(name);
    return reqList().some((r) => (r.id || gameFriendId(r.name)) === gid) ? "pending" : "";
  }
  function requestFriend(name, meta) {
    try {
      name = String(name || "").trim().slice(0, 40); if (!name) return { ok: false };
      meta = meta || {};
      const pid = gameFriendId(name); // ID tính từ tên; ID game gửi lên (meta.id) chỉ dùng để đối chiếu
      const st = friendStatus(pid);
      if (st) return { ok: true, status: st, already: true };
      const info = playerInfo(name), h = nameHash(name + "|req" + Math.floor(Date.now() / 36e5)), now = Date.now();
      meta = meta || {};
      reqList().push({ id: pid, name, meta: { g: meta.g || info.gender, age: Number(meta.age) || info.age, realm: meta.realm != null ? meta.realm : info.realm }, ts: now, due: now + 3000 + (h % 7000), accept: (h >>> 7) % 100 < 85 });
      notify("🤝", `Đã gửi lời mời kết bạn tới ${name}`);
      commit();
      return { ok: true, status: "pending" };
    } catch (e) { return { ok: false }; }
  }
  function friendReqTick() {
    try {
      const a = reqList(); if (!a.length) return;
      const now = Date.now(); let ch = false;
      a.slice().forEach((r) => {
        if (now < r.due) return;
        a.splice(a.indexOf(r), 1); ch = true;
        if (r.accept) { addGameFriend(r.name, r.meta); state.invited = (state.invited || []).filter((id) => { const d = FRIEND_DIR.find((x) => x.id === id); return !(d && gameFriendId(d.name) === r.id); }); notify("🤝", `${r.name} đã chấp nhận lời mời kết bạn`); if (!bblEl) toast(`🤝 ${r.name} đã chấp nhận lời mời kết bạn`); }
        else { notify("⏳", `${r.name} chưa phản hồi lời mời kết bạn`); if (!bblEl) toast(`${r.name} chưa phản hồi lời mời kết bạn`); }
      });
      if (ch) { commit(); refreshFriends(); try { const w = bblEl && bblEl.querySelector("iframe").contentWindow; if (w && w.__bblFriendSync) w.__bblFriendSync(); } catch (e) { } }
    } catch (e) { }
  }
  function selfOnline() { return (typeof navigator === "undefined" || navigator.onLine !== false) && !document.hidden; }
  function isPremium() { return Number(state.premiumUntil || 0) > Date.now(); }
  function premiumDaysLeft() { return Math.max(0, Math.ceil((Number(state.premiumUntil || 0) - Date.now()) / 864e5)); }
  function premiumLife() { return Number(state.premiumUntil || 0) >= LIFE_TS; }
  function premiumLabel() { return premiumLife() ? "trọn đời" : "còn " + premiumDaysLeft() + " ngày"; }
  function openCourses() {
    ui.shopCat = "study"; ui.shopSub = "Khóa học"; ui.shopQuery = "";
    closeModal();
    goTo("shop");
  }
  function buyPremium() {
    toast("👑 Premium đi kèm khóa học: vào Store → Khóa học và Tài liệu để mua gói.");
    openCourses();
    return false;
  }
  function addMonths(base, n) { const d = new Date(base); d.setMonth(d.getMonth() + n); return d.getTime(); }
  function grantCourse(p) {
    const plan = COURSE_PLANS.find((x) => x.id === p.plan);
    if (!plan) return;
    if (!state.courseAccess || typeof state.courseAccess !== "object") state.courseAccess = {};
    const now = Date.now();
    if (plan.life) {
      state.premiumUntil = LIFE_TS;
      state.courseAccess[p.lang] = LIFE_TS;
    } else {
      const ps = Math.max(now, Number(state.premiumUntil || 0));
      if (ps < LIFE_TS) state.premiumUntil = addMonths(ps, plan.months);
      const cs = Math.max(now, Number(state.courseAccess[p.lang] || 0));
      if (cs < LIFE_TS) state.courseAccess[p.lang] = addMonths(cs, plan.months);
    }
    state.chips = Number(state.chips || 0) + plan.chips;
    notify("👑", `${p.name}: đã mở khóa Premium ${plan.life ? "trọn đời" : plan.months + " tháng"} và tặng ${fmt(plan.chips)} chip game.`);
  }
  function premiumModal() {
    const on = isPremium();
    return `${modalHead("\u{1F451} WIND Premium")}<div class="p-5 space-y-4 text-xs">
    <div class="rounded-2xl p-4 text-white keep-white text-center" style="background:linear-gradient(135deg,#f59e0b,#ec4899 60%,#6366f1)"><div class="text-4xl">\u{1F451}</div><p class="font-extrabold text-base mt-1">${on ? `Premium ${premiumLabel()}` : "Nâng cấp học tập cùng bạn bè"}</p><p class="opacity-90 mt-1">Mở khóa khi mua khóa học</p></div>
    <ul class="space-y-2 text-slate-700"><li>⚔️ <b>Thách đấu bạn bè</b>: mời bạn, bạn chấp nhận hoặc từ chối, cả hai thi cùng một đề</li><li>\u{1F3C6} Tính điểm theo độ chính xác, tốc độ và chuỗi đúng liên tiếp</li><li>\u{1F4CA} Lịch sử đối đầu và tổng điểm thách đấu</li><li>\u{1F3B0} Tặng chip trong game theo từng gói khóa học</li></ul>
    <p class="text-slate-500">Chip hiện có: <b>${fmt(state.chips || 0)}</b>. Premium được cộng dồn khi mua thêm gói.</p>
    <button data-action="open-courses" class="w-full py-3 rounded-2xl text-white keep-white font-extrabold bg-gradient-to-r from-amber-500 to-pink-500">${on ? "Gia hạn bằng khóa học" : "Xem các gói khóa học"}</button></div>`;
  }
  // ----- chọc bạn bè -----
  function pokeFriend(id) {
    const f = friendById(id);
    if (!f) return false;
    const s = socialState();
    const last = Number(s.pokes[id] || 0);
    if (Date.now() - last < 15e3) { toast(`Đợi ${Math.ceil((15e3 - (Date.now() - last)) / 1e3)} giây nữa để chọc ${f.name} tiếp nhé`); return false; }
    s.pokes[id] = Date.now();
    commit();
    if (friendOnline(f)) {
      toast(`\u{1F449} Bạn vừa chọc ${f.name}!`);
      if (Math.random() < .7) window.setTimeout(() => { sfx("pokeback"); notify("\u{1F448}", `${f.name} chọc lại bạn!`); toast(`\u{1F448} ${f.name} chọc lại bạn!`); commit(); }, 3500 + Math.random() * 4500);
    } else {
      toast(`\u{1F449} Đã gửi lời chọc. ${f.name} sẽ thấy khi online`);
    }
    return true;
  }
  function pokeFx(el) {
    sfx("poke");
    try {
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      [0, 140].forEach((d) => {
        const ring = document.createElement("span");
        ring.className = "poke-ring"; ring.style.left = cx + "px"; ring.style.top = cy + "px"; ring.style.animationDelay = d + "ms";
        document.body.appendChild(ring); setTimeout(() => ring.remove(), 900);
      });
      ["\u{1F449}", "\u2728", "\u{1F4A5}", "\u{1F449}", "\u2728", "\u{1F4AB}"].forEach((e, i) => {
        const p = document.createElement("span");
        p.className = "poke-fx"; p.textContent = e; p.style.left = cx + "px"; p.style.top = cy + "px";
        p.style.setProperty("--dx", (i - 2.5) * 22 + "px"); p.style.setProperty("--rot", (i - 2.5) * 18 + "deg");
        p.style.animationDelay = (i * 0.05) + "s";
        document.body.appendChild(p); setTimeout(() => p.remove(), 1400 + i * 60);
      });
      const row = el.parentElement && el.parentElement.parentElement;
      if (row && row.animate) {
        row.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px) rotate(-1.2deg)" }, { transform: "translateX(8px) rotate(1.2deg)" }, { transform: "translateX(-5px)" }, { transform: "translateX(0)" }], { duration: 520, easing: "ease-in-out" });
        row.animate([{ boxShadow: "0 0 0 0 rgba(56,189,248,.75)", backgroundColor: "rgba(56,189,248,.3)" }, { boxShadow: "0 0 0 16px rgba(56,189,248,0)", backgroundColor: "rgba(56,189,248,0)" }], { duration: 800 });
      }
      if (el.animate) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.4) rotate(-14deg)" }, { transform: "scale(1)" }], { duration: 380 });
      try { navigator.vibrate && navigator.vibrate([30, 30, 30]); } catch (e) { }
    } catch (e) { }
  }
  // ----- thách đấu -----
  function scoreQ(ok, t, limit, streak) {
    if (!ok) return 0;
    return 100 + Math.round(50 * Math.max(0, 1 - t / limit)) + Math.min(streak, 5) * 10;
  }
  function mulberry(a) { return function () { a |= 0; a = a + 1831565813 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function simulateOpponent(ch, kinds) {
    const f = friendById(ch.fid) || FRIENDS[0];
    const rng = mulberry((ch.seed ^ hashStr(f.id)) >>> 0);
    let score = 0, correct = 0, streak = 0, ms = 0;
    for (let i = 0; i < ch.n; i++) {
      const kind = kinds && kinds[i] || "mc", limit = kind === "type" ? Q_LIMIT.type : Q_LIMIT.choice;
      const ok = rng() < f.skill - (kind === "type" ? .08 : 0);
      const t = limit * (.18 + .5 * rng());
      score += scoreQ(ok, t, limit, streak);
      streak = ok ? streak + 1 : 0;
      if (ok) correct++;
      ms += t * 1e3;
    }
    return { score, correct, total: ch.n, ms: Math.round(ms) };
  }
  var challengeListeners = [];
  function challengeChanged() { commit(); challengeListeners.forEach((fn) => { try { fn(); } catch (e) { } }); refreshFriends(); }
  var CH = {
    list: () => socialState().challenges,
    get: (id) => socialState().challenges.find((c) => c.id === id),
    onChange: (fn) => { challengeListeners.push(fn); },
    create(fid, n) {
      if (!isPremium()) return null;
      const f = friendById(fid);
      if (!f || !friendOnline(f)) { toast("Bạn bè đang offline, hãy thử chọc bạn trước nhé"); return null; }
      const s = socialState();
      if (s.challenges.some((c) => c.dir === "out" && c.fid === fid && (c.status === "pending" || c.status === "accepted"))) { toast("Bạn đang có một lời thách đấu chưa xong với bạn này"); return null; }
      const ch = { id: uid("ch"), dir: "out", fid, n, seed: Math.floor(Math.random() * 2147483647), ts: Date.now(), status: "pending", replyAt: Date.now() + 3e3 + Math.random() * 4e3, my: null, their: null, lesson: "s1a-1" };
      s.challenges.unshift(ch);
      if (s.challenges.length > 30) s.challenges.length = 30;
      challengeChanged();
      return ch;
    },
    respond(id, accept) {
      const ch = CH.get(id);
      if (!ch || ch.status !== "pending" || ch.dir !== "in") return;
      const f = friendById(ch.fid);
      ch.status = accept ? "accepted" : "declined";
      notify(accept ? "✅" : "\u{1F6AB}", accept ? `Bạn đã chấp nhận thách đấu của ${f.name}` : `Bạn đã từ chối thách đấu của ${f.name}`);
      challengeChanged();
    },
    remove(id) {
      const s = socialState(), ch = s.challenges.find((c) => c.id === id);
      if (!ch) return false;
      const before = s.challenges.length;
      s.challenges = s.challenges.filter((c) => ch.gid ? c.gid !== ch.gid : c.id !== id);
      if (s.challenges.length === before) return false;
      challengeChanged();
      return true;
    },
    clearNotices() {
      const s = socialState();
      const isNotice = (c) => (c.dir === "in" && c.status === "pending") || c.status === "accepted";
      const gids = new Set(s.challenges.filter((c) => isNotice(c) && c.gid).map((c) => c.gid));
      const before = s.challenges.length;
      s.challenges = s.challenges.filter((c) => !isNotice(c) && !(c.gid && gids.has(c.gid)));
      const removed = before - s.challenges.length;
      if (removed) challengeChanged();
      return removed;
    },
    createGroup(fids, n) {
      if (!isPremium()) return [];
      const s = socialState(), gid = uid("gp"), seed = Math.floor(Math.random() * 2147483647), made = [], skipped = [];
      [...new Set(fids)].forEach((fid) => {
        const f = friendById(fid);
        if (!f || !friendOnline(f)) { skipped.push(f ? f.name : fid); return; }
        if (s.challenges.some((c) => c.dir === "out" && c.fid === fid && (c.status === "pending" || c.status === "accepted"))) { skipped.push(f.name); return; }
        made.push({ id: uid("ch"), dir: "out", fid, n, seed, gid, ts: Date.now(), status: "pending", replyAt: Date.now() + 3e3 + Math.random() * 5e3, my: null, their: null, lesson: "s1a-1" });
      });
      if (!made.length) { toast("Không gửi được: các bạn đã chọn đang offline hoặc đang có lời thách đấu chưa xong"); return []; }
      made.reverse().forEach((c) => s.challenges.unshift(c));
      if (s.challenges.length > 40) s.challenges.length = 40;
      if (skipped.length) toast(`Bỏ qua: ${skipped.join(", ")}`);
      challengeChanged();
      return made;
    },
    finishGroup(gid, my, kinds) {
      const s = socialState();
      const all = s.challenges.filter((c) => c.gid === gid && c.dir === "out");
      const acc = all.filter((c) => c.status === "accepted");
      if (!acc.length) return null;
      all.forEach((c) => { if (c.status === "pending") c.status = "expired"; });
      const rows = acc.map((c) => { CH.finish(c.id, my, kinds, true); const f = friendById(c.fid); return { id: c.fid, name: f.name, ...c.their, me: false }; });
      const board = [{ id: "me", name: state.userName, ...my, me: true }, ...rows]
        .sort((a, b) => b.score - a.score || a.ms - b.ms).map((r, i) => ({ ...r, rank: i + 1 }));
      const mine = board.find((r) => r.me), size = board.length;
      acc.forEach((c) => { c.grp = { rank: mine.rank, size }; });
      s.points += mine.rank === 1 ? 40 : mine.rank === 2 ? 25 : mine.rank === 3 ? 15 : 0;
      notify(["\u{1F947}", "\u{1F948}", "\u{1F949}"][mine.rank - 1] || "\u{1F3C1}", `Thách đấu nhóm: bạn đứng hạng ${mine.rank}/${size}`);
      challengeChanged();
      return { gid, n: acc[0].n, board, size, rank: mine.rank };
    },
    finish(id, my, kinds, quiet) {
      const ch = CH.get(id);
      if (!ch || ch.status !== "accepted") return null;
      const s = socialState(), f = friendById(ch.fid);
      ch.my = my;
      ch.their = simulateOpponent(ch, kinds);
      ch.status = "done";
      const r = s.record[ch.fid] || (s.record[ch.fid] = { w: 0, l: 0, d: 0 });
      if (my.score > ch.their.score) { r.w++; s.points += 30; } else if (my.score < ch.their.score) { r.l++; s.points += 5; } else { r.d++; s.points += 15; }
      s.points += Math.round(my.score / 100);
      if (!quiet) notify("⚔️", `Kết quả thách đấu với ${f.name}: ${my.score} - ${ch.their.score}`);
      challengeChanged();
      return ch;
    },
    scoreQ, limits: Q_LIMIT
  };
  function socialTick() {
    const now = Date.now(), s = socialState();
    let changed = false;
    s.challenges.forEach((ch) => {
      const f = friendById(ch.fid);
      if (!f) return;
      if (ch.dir === "out" && ch.status === "pending" && now >= ch.replyAt) {
        const ok = Math.random() < f.accept;
        ch.status = ok ? "accepted" : "declined";
        notify(ok ? "✅" : "\u{1F6AB}", ok ? `${f.name} đã chấp nhận thách đấu của bạn!` : `${f.name} đã từ chối lời thách đấu.`);
        toast(ok ? `✅ ${f.name} chấp nhận thách đấu!` : `\u{1F6AB} ${f.name} từ chối thách đấu`);
        changed = true;
      }
      if (ch.dir === "in" && ch.status === "pending" && now - ch.ts > 10 * 6e4) { ch.status = "expired"; changed = true; }
    });
    if (isPremium() && !s.challenges.some((c) => c.dir === "in" && c.status === "pending") && Math.random() < .12) {
      const on = FRIENDS.filter((f) => friendOnline(f));
      if (on.length) {
        const f = on[Math.floor(Math.random() * on.length)];
        s.challenges.unshift({ id: uid("ch"), dir: "in", fid: f.id, n: [10, 15, 20][Math.floor(Math.random() * 3)], seed: Math.floor(Math.random() * 2147483647), ts: now, status: "pending", my: null, their: null, lesson: "s1a-1" });
        notify("⚔️", `${f.name} thách đấu bạn! Mở Giải trí → Thách đấu để chấp nhận, từ chối hoặc xóa.`);
        toast(`⚔️ ${f.name} thách đấu bạn!`);
        changed = true;
      }
    }
    if (changed) challengeChanged();
  }
  // ----- chat: tin nhắn riêng, nhóm, kênh Thế giới -----
  var CHAT_REPLIES = ["Chào bạn! 👋", "Mình đang ôn Bài 1 Seoul Korean nè, bạn học tới đâu rồi?", "Haha, để mình thử thách đấu với bạn sau nhé ⚔️", "Cố lên nha, mình cũng đang học từ vựng đây 💪", "Ok bạn, lát mình nhắn lại nhé!", "Bạn có nhớ từ mới hôm qua không? Mình quên mất vài từ rồi 😅"];
  var WORLD_REPLIES = ["Chào cả nhà! 👋", "Ai đang ôn TOEIC không, rủ nhau học nè", "Hôm nay mình học được 20 từ mới 🎉", "Có ai thi HSK tháng này không?", "Cố lên mọi người ơi 💪", "Mình vừa thắng một trận thách đấu, vui quá ⚔️", "Chúc cả nhà một ngày học tốt ☀️"];
  function chatKey(t) { return t.type === "world" ? "world" : t.type === "group" ? "grp:" + t.id : t.id; }
  function chatMeta() {
    const t = ui.chat;
    if (!t) return null;
    if (t.type === "world") return { title: "🌍 Thế giới", sub: "Kênh chung · mọi người cùng trò chuyện", names: true };
    if (t.type === "group") {
      const g = socialState().groups.find((x) => x.id === t.id);
      return g ? { title: "👥 " + g.name, sub: `${g.members.length + 1} thành viên: Bạn, ${g.members.map((id) => (friendById(id) || { name: "?" }).name).join(", ")}`, names: true, g } : null;
    }
    const f = friendById(t.id);
    return f ? { title: "💬 " + f.name, sub: friendOnline(f) ? "● Đang online" : "○ Offline · bạn ấy sẽ thấy tin khi online", names: false, f } : null;
  }
  function chatModal() {
    const m = chatMeta();
    if (!m) return `${modalHead("💬 Tin nhắn")}<div class="p-5 text-xs text-slate-500">Không tìm thấy cuộc trò chuyện.</div>`;
    const list = socialState().msgs[chatKey(ui.chat)] || [];
    const nameOf = (from) => from === "f" && m.f ? m.f.name : (friendById(from) || { name: "Bạn bè" }).name;
    const invCard = (x, mine) => {
      const v = x.inv, nm = esc(v.name || "Game bài"), ok = v.st === "ok";
      return `<div class="flex ${mine ? "justify-end" : "justify-start"}"><div style="max-width:86%;min-width:210px;border-radius:16px;padding:10px 12px;font-size:12px;background:linear-gradient(135deg,#0f3d33,#0b2a3a);color:#e8fff6;border:1px solid #2fd6a6;box-shadow:0 2px 10px rgba(16,185,129,.25)">
        <p style="font-weight:800;margin:0 0 2px">🎮 Lời mời chơi bài ${ok ? '<span style="font-size:10px;background:#16a34a;color:#fff;border-radius:99px;padding:1px 7px;margin-left:4px">Bạn bè đã nhận lời</span>' : '<span style="font-size:10px;background:#b45309;color:#fff;border-radius:99px;padding:1px 7px;margin-left:4px">Đang chờ</span>'}</p>
        <p style="margin:0;opacity:.9">${nm} · bàn ${v.n} người · cược ${fmt(v.b)} chip</p>
        <p style="margin:2px 0 8px">ID bàn: <b style="letter-spacing:.08em;font-size:14px;color:#ffe08a">${esc(v.id)}</b></p>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><button data-action="join-room" data-room="${esc(v.id)}|${esc(v.g)}|${v.n}|${v.b}" style="background:linear-gradient(#34d399,#059669);color:#fff;border:0;border-radius:10px;padding:6px 12px;font-weight:800;font-size:11px">▶ Vào bàn</button><button data-action="copy-acc" data-text="${esc(v.id)}" style="background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:10px;padding:6px 10px;font-weight:700;font-size:11px">Sao chép ID</button>${v.url ? `<button data-action="copy-acc" data-text="${esc(v.url + "#room=" + v.id + "&c=" + v.g + "-" + v.n + "-" + v.b)}" style="background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:10px;padding:6px 10px;font-weight:700;font-size:11px">Sao chép link</button>` : ""}</div></div></div>`;
    };
    const bubbles = list.length ? list.map((x) => x.inv ? invCard(x, x.from === "me") : x.from === "me"
      ? (x.adm ? `<div class="flex justify-end"><div class="max-w-[80%]"><p class="text-[10px] font-extrabold text-amber-600 text-right mb-0.5">👑 BigBoss</p><div class="adm-bubble px-3 py-2 rounded-2xl text-xs text-white keep-white break-words${Date.now() - x.ts < 4000 ? " adm-pop" : ""}">${esc(x.t)}</div></div></div>` : `<div class="flex justify-end"><div class="max-w-[80%] px-3 py-2 rounded-2xl text-xs bg-sky-600 text-white keep-white break-words">${esc(x.t)}</div></div>`)
      : `<div class="flex justify-start"><div class="max-w-[80%]">${m.names ? `<p class="text-[10px] font-bold text-slate-500 mb-0.5">${esc(nameOf(x.from))}</p>` : ""}<div class="px-3 py-2 rounded-2xl text-xs bg-slate-100 text-slate-800 break-words">${esc(x.t)}</div></div></div>`).join("") : `<p class="text-center text-[11px] text-slate-400 py-6">Chưa có tin nhắn. Hãy nói xin chào!</p>`;
    return `${modalHead(esc(m.title))}<div class="p-4 space-y-3"><div class="flex items-start justify-between gap-2"><p class="text-[11px] font-bold text-slate-500">${esc(m.sub)}</p>${m.g ? `<button data-action="grp-del" data-id="${m.g.id}" class="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-600">🗑 Xóa nhóm</button>` : ""}</div>
      <div id="chat-log" class="space-y-2 max-h-[45vh] overflow-y-auto">${bubbles}</div>
      <div class="flex gap-2"><input id="msg-input" data-autofocus maxlength="300" autocomplete="off" placeholder="Nhập tin nhắn..." class="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800"><button data-action="msg-send" class="px-4 py-2 rounded-xl text-xs font-extrabold bg-sky-600 text-white keep-white">Gửi</button></div></div>`;
  }
  function sendChat(text) {
    const t = ui.chat, m = chatMeta(), body = String(text || "").trim().slice(0, 300);
    if (!t || !m || !body) return false;
    const s = socialState(), key = chatKey(t), arr = s.msgs[key] || (s.msgs[key] = []);
    arr.push({ from: "me", t: body, ts: Date.now(), adm: isAdmin() || undefined });
    const cap = t.type === "world" ? 100 : 60;
    if (arr.length > cap) arr.splice(0, arr.length - cap);
    commit();
    const pool = t.type === "dm" ? [m.f].filter((f) => friendOnline(f)) : t.type === "group" ? m.g.members.map(friendById).filter((f) => f && friendOnline(f)) : FRIENDS.filter((f) => friendOnline(f));
    if (!pool.length || (t.type === "world" && Math.random() < .25)) return true;
    const f = pool[Math.floor(Math.random() * pool.length)], target = { type: t.type, id: t.id };
    window.setTimeout(() => {
      const a = socialState().msgs[key] || (socialState().msgs[key] = []);
      const bank = target.type === "world" ? WORLD_REPLIES : CHAT_REPLIES;
      a.push({ from: f.id, t: bank[Math.floor(Math.random() * bank.length)], ts: Date.now() });
      commit();
      if (ui.renderModal === chatModal && ui.chat && ui.chat.type === target.type && ui.chat.id === target.id) { refreshModal(); scrollChat(); }
      else if (target.type !== "world") notify("💬", `${f.name} đã nhắn tin${target.type === "group" ? " trong nhóm" : " cho bạn"}`);
    }, 1500 + Math.random() * 2500);
    return true;
  }
  function scrollChat() { const l = $("#chat-log"); if (l) l.scrollTop = l.scrollHeight; const i = $("#msg-input"); if (i) i.focus(); }
  function openChat(t) { ui.chat = t; openModal(chatModal); scrollChat(); }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target && e.target.id === "msg-input" && ui.renderModal === chatModal) {
      e.preventDefault();
      if (sendChat(e.target.value)) { refreshModal(); scrollChat(); }
    }
  });
  function grpCreateModal() {
    return `${modalHead("👥 Tạo nhóm chat")}<div class="p-5 space-y-3 text-xs"><div><label class="font-bold text-slate-700" for="grp-name">Tên nhóm</label><input id="grp-name" data-autofocus maxlength="30" placeholder="Ví dụ: Nhóm ôn TOEIC" class="${field} mt-1"></div>
      <div><p class="font-bold text-slate-700 mb-1">Chọn thành viên</p><div class="space-y-1.5">${FRIENDS.map((f) => `<label class="flex items-center gap-2 p-2 rounded-xl bg-slate-50"><input type="checkbox" class="grp-chk accent-sky-600" value="${f.id}"> <span class="font-semibold text-slate-800">${esc(f.name)}</span></label>`).join("")}</div></div>
      <button data-action="grp-create" class="w-full ${btnPrimary}">Tạo nhóm</button></div>`;
  }
  function chatCard() {
    const s = socialState();
    const last = (k) => { const a = s.msgs[k] || [], m = a[a.length - 1]; return m ? esc(m.t.slice(0, 60)) : "Chưa có tin nhắn"; };
    const rowBtn = (act, id, icon, title, sub, k) => `<button data-action="${act}" ${id ? `data-id="${id}"` : ""} class="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/70 hover:bg-white text-left"><span class="text-2xl shrink-0">${icon}</span><span class="min-w-0 flex-1"><span class="block text-xs font-extrabold text-slate-800 truncate">${title} <span class="font-semibold text-[10px] text-slate-400">${sub}</span></span><span class="block text-[11px] text-slate-500 truncate">${last(k)}</span></span></button>`;
    return `<div class="glass-card p-4 rounded-2xl space-y-2"><div class="flex items-center justify-between gap-2"><h3 class="font-extrabold text-sm text-slate-800">💬 Kênh trò chuyện</h3><button data-action="open-grp-create" class="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-sky-100 text-sky-800">➕ Tạo nhóm</button></div>
      ${rowBtn("open-world", "", "🌍", "Thế giới", "Kênh chung", "world")}
      ${s.groups.map((g) => rowBtn("open-group", g.id, "👥", esc(g.name), g.members.length + 1 + " thành viên", "grp:" + g.id)).join("")}</div>`;
  }
  // ----- giao diện bạn bè -----
  function friendsCard() {
    const now = Date.now(), s = socialState();
    const rows = FRIENDS.map((f) => ({ f, on: friendOnline(f, now) })).sort((a, b) => Number(b.on) - Number(a.on));
    const onCount = rows.filter((r) => r.on).length;
    const me = selfOnline();
    const rec = (id) => { const r = s.record[id]; return r ? `${r.w}T-${r.l}B-${r.d}H` : ""; };
    const open = !!ui.friendsOpen;
    const head = `<button data-action="toggle-friends" aria-expanded="${open}" class="w-full flex items-center justify-between gap-2 text-left"><h3 class="font-extrabold text-sm text-slate-800">\u{1F465} Bạn bè <span class="text-[11px] font-bold text-emerald-600">● ${onCount}/${FRIENDS.length} online</span></h3><span class="text-slate-400 text-xs">${open ? "▲ Thu gọn" : "▼ Xem danh sách"}</span></button>`;
    if (!open) return `<div class="glass-card p-4 rounded-2xl">${head}</div>`;
    return `<div class="glass-card p-4 rounded-2xl space-y-3">
      ${head}
      <div class="flex justify-end"><button data-action="open-premium" class="px-3 py-1.5 rounded-xl text-[11px] font-extrabold text-white keep-white bg-gradient-to-r from-amber-500 to-pink-500">\u{1F451} ${isPremium() ? `Premium · ${premiumLabel()}` : "Premium"}</button></div>
      <div class="flex items-center gap-3 p-2 rounded-xl bg-sky-50/70"><div class="pr-1">${renderPfp(state.userName, state.avatarId, myFrameId(), 46, { status: me ? "on" : "off" })}</div><div class="min-w-0"><p class="font-bold text-xs text-slate-800 truncate">${esc(state.userName)} (Bạn)</p><p class="text-[10px] ${me ? "text-emerald-600" : "text-slate-500"} font-bold">${me ? "Đang hoạt động" : "Ngoại tuyến"}${isPremium() ? " · \u{1F451}" : ""}${s.points ? ` · ⚔️ ${s.points} điểm` : ""}</p></div></div>
      <div class="space-y-2">${rows.map(({ f, on }) => `<div class="flex items-center gap-3 p-2 rounded-xl ${on ? "bg-white/70" : "bg-slate-100/60"}"><div class="pr-1 shrink-0">${renderPfp(f.name, f.avatarId, "r-" + f.realm, 44, { status: on ? "on" : "off", realm: f.realm })}</div>
        <div class="flex-1 min-w-0"><p class="font-bold text-xs text-slate-800 truncate">${esc(f.name)}</p><p class="text-[10px] ${on ? "text-emerald-600" : "text-slate-400"} font-semibold">${on ? "Online" : `Offline · ${friendSince(f, now)} phút trước`} · ${(CULTIVATION_RANKS[f.realm] || CULTIVATION_RANKS[0]).name}${rec(f.id) ? ` · ${rec(f.id)}` : ""}</p></div>
        <div class="flex gap-1.5 shrink-0"><button data-action="poke-friend" data-id="${f.id}" class="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-sky-100 text-sky-800" aria-label="Chọc ${esc(f.name)}">\u{1F449} Chọc</button><button data-action="open-chat" data-id="${f.id}" class="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800" aria-label="Nhắn tin cho ${esc(f.name)}">\u{1F4AC} Tin nhắn</button><button data-action="duel-friend" data-id="${f.id}" ${on ? "" : "disabled"} class="px-2 py-1.5 rounded-lg text-[11px] font-bold ${on ? "bg-amber-500 text-white keep-white" : "bg-slate-200 text-slate-400"}" aria-label="Thách đấu ${esc(f.name)}">⚔️ Thách đấu</button></div></div>`).join("")}</div></div>`;
  }
  function duelCard() {
    restoreGameFriends();
    const now = Date.now(), s = socialState(), prem = isPremium();
    const pend = s.challenges.filter((c) => c && friendById(c.fid) && c.dir === "in" && c.status === "pending");
    const ready = s.challenges.filter((c) => c && friendById(c.fid) && c.status === "accepted").filter((c, i, a) => !c.gid || a.findIndex((x) => x.gid === c.gid) === i);
    const rows = FRIENDS.map((f) => ({ f, on: friendOnline(f, now) })).sort((a, b) => Number(b.on) - Number(a.on));
    const onCount = rows.filter((r) => r.on).length;
    const rec = (id) => { const r = s.record[id]; return r ? `${r.w}T-${r.l}B-${r.d}H` : ""; };
    const row = ({ f, on }) => `<div class="flex items-center gap-2 p-2 rounded-xl ${on ? "bg-white/70" : "bg-slate-100/60"}"><div class="shrink-0">${renderPfp(f.name, f.avatarId, "r-" + f.realm, 38, { status: on ? "on" : "off", realm: f.realm })}</div><div class="flex-1 min-w-0"><p class="font-bold text-xs text-slate-800 truncate">${esc(f.name)}</p><p class="text-[10px] ${on ? "text-emerald-600" : "text-slate-400"} font-semibold">${on ? "Online" : "Offline"} · ${(CULTIVATION_RANKS[f.realm] || CULTIVATION_RANKS[0]).name}${rec(f.id) ? " · " + rec(f.id) : ""}</p></div><div class="flex gap-1.5 shrink-0"><button data-action="poke-friend" data-id="${f.id}" class="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-sky-100 text-sky-800" aria-label="Chọc ${esc(f.name)}">👉</button><button data-action="duel-friend" data-id="${f.id}" ${on ? "" : "disabled"} class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${on ? "bg-rose-600 text-white keep-white" : "bg-slate-200 text-slate-400"}">⚔️ Thách đấu</button></div></div>`;
    return `<div class="glass-card p-4 rounded-2xl space-y-3 border-t-4 border-t-rose-500">
      <div class="flex items-start justify-between gap-2">
        <div><div class="text-[12px] font-black tracking-wider" style="background:linear-gradient(90deg,#be185d,#7c3aed);-webkit-background-clip:text;background-clip:text;color:transparent">🌸 HOA SƠN LUẬN KIẾM</div><h4 class="font-bold text-sm text-slate-800">Cùng thi một đề, ai chính xác và nhanh hơn sẽ thắng</h4>
        <p class="text-xs text-slate-500">${prem ? `WIND Premium ${premiumLabel()}` : "Cần WIND Premium để gửi lời thách đấu"} · ● ${onCount}/${FRIENDS.length} bạn đang online</p></div>
        <button data-action="open-premium" class="px-3 py-1.5 rounded-xl text-[11px] font-extrabold text-white keep-white bg-gradient-to-r from-amber-500 to-pink-500 whitespace-nowrap">👑 ${prem ? "Premium" : "Mở khóa"}</button>
      </div>
      ${pend.length + ready.length ? `<div class="flex items-center justify-between gap-2"><p class="text-[11px] font-extrabold text-slate-600">🔔 Thông báo (${pend.length + ready.length})</p><button data-action="ch-clear" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-200 text-slate-700">🗑 Xóa tất cả</button></div>` : ""}
      ${pend.map((c) => { const f = friendById(c.fid); return `<div class="p-3 rounded-xl border border-amber-300 bg-amber-50 space-y-2"><div class="flex items-start justify-between gap-2"><p class="text-xs font-bold text-amber-900">⚔️ ${esc(f.name)} thách đấu bạn · ${c.n} câu</p><button data-action="ch-del" data-id="${c.id}" class="shrink-0 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white/80 text-slate-500" aria-label="Xóa thông báo">🗑 Xóa</button></div><div class="flex gap-2"><button data-action="ch-accept" data-id="${c.id}" class="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white keep-white">Chấp nhận</button><button data-action="ch-decline" data-id="${c.id}" class="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-200 text-slate-700">Từ chối</button></div></div>`; }).join("")}
      ${ready.map((c) => { const f = friendById(c.fid); return `<div class="p-3 rounded-xl border border-emerald-300 bg-emerald-50 flex items-center justify-between gap-2"><p class="text-xs font-bold text-emerald-900">✅ ${esc(f.name)} sẵn sàng · ${c.n} câu</p><div class="flex gap-1.5 shrink-0"><button data-action="ch-play" data-id="${c.id}" class="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white keep-white">Vào thi</button><button data-action="ch-del" data-id="${c.id}" class="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-white/80 text-slate-500" aria-label="Xóa thông báo">🗑</button></div></div>`; }).join("")}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">${rows.slice(0, 7).map(row).join("")}</div>
      <button data-action="open-duel" style="background:#334155" class="w-full py-2 text-white keep-white rounded-xl text-xs font-bold">⚔️ Phòng thách đấu</button>
    </div>`;
  }
  function refreshFriends() {
    const el = $("#friends-card");
    if (el && ui.tab === "community" && !ui.renderModal) el.innerHTML = friendsCard();
    const hb = $("#hub-body");
    if (hb && ui.tab === "entertainment" && !ui.renderModal && (ui.hubTab === "mine" || ui.hubTab === "groups")) { const h = hubBody(); if (hb.dataset.h !== h) { hb.innerHTML = h; hb.dataset.h = h; } }
    const dc = $("#duel-card");
    if (dc && ui.tab === "entertainment" && !ui.renderModal) {
      const h = duelCard();
      if (dc.dataset.h !== h) { dc.innerHTML = h; dc.dataset.h = h; }
    }
    bblRefresh();
  }
  Object.assign(actions, {
    "toggle-friends": () => { ui.friendsOpen = !ui.friendsOpen; refreshFriends(); },
    "open-premium": () => openModal(premiumModal),
    "buy-premium": () => { buyPremium(); },
    "poke-friend": (el) => { if (pokeFriend(el.dataset.id)) pokeFx(el); },
    "open-duel": () => { if (typeof window.__s1aOpen === "function") window.__s1aOpen({}); },
    "duel-friend": (el) => {
      if (!isPremium()) { openModal(premiumModal); return; }
      if (typeof window.__s1aOpen === "function") window.__s1aOpen({ duelFriend: el.dataset.id });
    },
    "ch-accept": (el) => { CH.respond(el.dataset.id, true); toast("Đã chấp nhận! Bấm \"Vào thi\" khi bạn sẵn sàng."); },
    "ch-decline": (el) => { CH.respond(el.dataset.id, false); toast("Đã từ chối lời thách đấu"); },
    "ch-play": (el) => { if (typeof window.__s1aOpen === "function") { const c = CH.get(el.dataset.id); window.__s1aOpen(c && c.gid ? { duelGroup: c.gid } : { duel: el.dataset.id }); } },
    "ch-del": (el) => { if (CH.remove(el.dataset.id)) toast("Đã xóa thông báo"); },
    "ch-clear": () => { const n = CH.clearNotices(); toast(n ? "Đã xóa tất cả thông báo" : "Không có thông báo để xóa"); },
    "open-chat": (el) => openChat({ type: "dm", id: el.dataset.id }),
    "open-world": () => openChat({ type: "world", id: "world" }),
    "open-group": (el) => openChat({ type: "group", id: el.dataset.id }),
    "open-grp-create": () => openModal(grpCreateModal),
    "grp-create": () => {
      const name = val("grp-name"), members = [...document.querySelectorAll(".grp-chk:checked")].map((x) => x.value);
      if (name.length < 2) { toast("Tên nhóm cần tối thiểu 2 ký tự"); return; }
      if (!members.length) { toast("Hãy chọn ít nhất 1 thành viên"); return; }
      const g = { id: uid("gp"), name, members, ts: Date.now() };
      socialState().groups.unshift(g);
      commit();
      openChat({ type: "group", id: g.id });
      toast("Đã tạo nhóm chat");
    },
    "grp-del": (el) => {
      if (!window.confirm("Xóa nhóm chat này?")) return;
      const s = socialState();
      s.groups = s.groups.filter((g) => g.id !== el.dataset.id);
      delete s.msgs["grp:" + el.dataset.id];
      commit();
      closeModal();
      toast("Đã xóa nhóm");
    },
    "msg-send": () => { const i = $("#msg-input"); if (i && sendChat(i.value)) { refreshModal(); scrollChat(); if (isAdmin()) admBurst(); } }
  });
