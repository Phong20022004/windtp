  // ===== WINDTP social layer: Premium, bạn bè, trạng thái hoạt động, chọc, thách đấu =====
  var PREMIUM_PRICE = 50000;
  var PREMIUM_DAYS = 30;
  var Q_LIMIT = { choice: 20, type: 40 };
  var FRIENDS = [
    { id: "fr-an", name: "Nguyễn Hoài An", avatarId: "default", realm: 3, skill: .86, accept: .85, p: .75, cyc: 7, off: 1 },
    { id: "fr-minh", name: "Lê Minh", avatarId: "default", realm: 2, skill: .74, accept: .7, p: .6, cyc: 5, off: 3 },
    { id: "fr-huy", name: "Phạm Gia Huy", avatarId: "default", realm: 5, skill: .92, accept: .6, p: .55, cyc: 9, off: 2 },
    { id: "fr-vy", name: "Đỗ Thảo Vy", avatarId: "default", realm: 1, skill: .66, accept: .9, p: .65, cyc: 6, off: 4 },
    { id: "fr-bao", name: "Võ Quốc Bảo", avatarId: "default", realm: 0, skill: .58, accept: .8, p: .4, cyc: 8, off: 5 },
    { id: "fr-jimin", name: "Park Ji-min", avatarId: "default", realm: 4, skill: .8, accept: .55, p: .5, cyc: 11, off: 6 },
    { id: "fr-b", name: "Trần Thị B", avatarId: "default", realm: 2, skill: .7, accept: .75, p: .3, cyc: 6, off: 7 }
  ];
  var FRIEND_META = { "fr-an": ["nu", 22], "fr-minh": ["nam", 25], "fr-huy": ["nam", 19], "fr-vy": ["nu", 21], "fr-bao": ["nam", 30], "fr-jimin": ["nu", 27], "fr-b": ["nu", 24] };
  function socialState() {
    if (!state.social || typeof state.social !== "object") state.social = {};
    const s = state.social;
    if (!Array.isArray(s.challenges)) s.challenges = [];
    if (!s.record || typeof s.record !== "object") s.record = {};
    if (!s.pokes || typeof s.pokes !== "object") s.pokes = {};
    if (typeof s.points !== "number") s.points = 0;
    if (!s.msgs || typeof s.msgs !== "object") s.msgs = {};
    if (!Array.isArray(s.groups)) s.groups = [];
    if (!Array.isArray(s.msgs.world)) {
      const t = Date.now();
      s.msgs.world = [
        { from: "fr-an", t: "Chào mừng mọi người đến kênh Thế giới! 🌍", ts: t - 36e5 },
        { from: "fr-huy", t: "Hôm nay mình ôn HSK 20 phút, ai cùng học không?", ts: t - 24e5 },
        { from: "fr-vy", t: "Mình đang tìm bạn luyện nói tiếng Nhật nè 🎌", ts: t - 12e5 }
      ];
    }
    return s;
  }
  function frac(x) { return x - Math.floor(x); }
  function friendOnline(f, now = Date.now()) {
    const bucket = Math.floor(now / (f.cyc * 6e4));
    return frac(bucket * .6180339 + f.off * .137) < f.p;
  }
  function friendSince(f, now = Date.now()) {
    return Math.max(1, Math.round((now % (f.cyc * 6e4)) / 6e4) + 1);
  }
  function friendById(id) { let f = FRIENDS.find((x) => x.id === id); if (!f) { restoreGameFriends(); f = FRIENDS.find((x) => x.id === id); } return f; }
  function restoreGameFriends() {
    try {
      const a = socialState().extraFriends;
      const keep = new Set(Array.isArray(a) ? a.map((x) => x && x.id) : []);
      for (let i = FRIENDS.length - 1; i >= 0; i--) { if (/^fr-g-/.test(FRIENDS[i].id) && !keep.has(FRIENDS[i].id)) { delete FRIEND_META[FRIENDS[i].id]; FRIENDS.splice(i, 1); } }
      if (!Array.isArray(a)) return;
      a.forEach((x) => {
        if (x && x.id && !FRIENDS.some((f) => f.id === x.id)) {
          const meta = x.meta, f = { ...x }; delete f.meta;
          FRIENDS.push(f); FRIEND_META[f.id] = Array.isArray(meta) ? meta : ["", null];
        }
      });
    } catch (e) { }
  }
  function addGameFriend(name, meta) {
    try {
      restoreGameFriends();
      name = String(name || "").trim().slice(0, 40);
      if (!name) return { ok: false };
      const gid0 = gameFriendId(name), ex = FRIENDS.find((f) => f.id === gid0 || gameFriendId(f.name) === gid0);
      if (ex) return { ok: true, already: true, id: ex.id };
      meta = meta || {};
      const h = nameHash(name);
      const realm = Math.max(0, Math.min(8, Number(meta.realm) || 0));
      const f = { id: gid0, name, avatarId: "default", realm, skill: .6 + (h % 30) / 100, accept: .75, p: .6, cyc: 5 + (h % 7), off: 1 + (h % 7) };
      const fm = [meta.g || "", Number(meta.age) || null];
      FRIENDS.push(f); FRIEND_META[f.id] = fm;
      const s2 = socialState(); if (!Array.isArray(s2.extraFriends)) s2.extraFriends = [];
      s2.extraFriends.push({ ...f, meta: fm });
      save();
      return { ok: true, id: f.id };
    } catch (e) { return { ok: false }; }
  }

