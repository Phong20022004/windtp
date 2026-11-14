  // ===== Lofi Chill Radio: 3 bài lofi không lời, do app tự tạo trên trình duyệt (không dùng file âm thanh). =====
  // chords: nốt MIDI của từng hợp âm; sec: số giây mỗi hợp âm; lp: tần số lọc thấp; arp: rải hợp âm; bass: bè trầm; crackle: tiếng đĩa than.
  var TRACKS = [
    { id: "focus", name: "Tập Trung Sâu", emoji: "\u{1F3AF}", desc: "Chậm, ấm, có tiếng đĩa than, êm dịu để tập trung lâu", sec: 5, lp: 1100, arp: false, bass: true, crackle: true, wave: ["triangle", "sine"],
      chords: [[50, 57, 60, 64], [55, 59, 65, 64], [48, 55, 59, 64], [45, 55, 60, 64]] },
    { id: "cafe", name: "Cà Phê Sáng", emoji: "☕", desc: "Nhẹ, sáng, rải từng nốt như guitar", sec: 3.5, lp: 1900, arp: true, bass: true, crackle: false, wave: ["sine", "triangle"],
      chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]] },
    { id: "rain", name: "Mưa Đêm", emoji: "\u{1F327}\uFE0F", desc: "Tiếng mưa rơi êm, thi thoảng có sấm xa — không có nhạc", rain: true, lp: 9000, sec: 0, arp: false, bass: false, crackle: false, wave: ["sine", "sine"], chords: [[60]] }
  ];
  var trackIdx = 0;
  var ctx = null, master = null, lpFilter = null, timer, step = 0, playing = false, noise = null;
  var rainNodes = [], rainTimer, thunderTimer;
  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function curTrack() { return TRACKS[trackIdx] || TRACKS[0]; }
  function isSupported() {
    return typeof window !== "undefined" && (typeof AudioContext !== "undefined" || "webkitAudioContext" in window);
  }
  function isPlaying() { return playing; }
  function baseCtx() {
    if (!ctx) { const Ctor = window.AudioContext || window.webkitAudioContext; ctx = new Ctor(); }
    return ctx;
  }
  function ensure() {
    baseCtx();
    if (ctx && !master) {
      master = ctx.createGain();
      master.gain.value = 0.5;
      lpFilter = ctx.createBiquadFilter();
      lpFilter.type = "lowpass";
      lpFilter.frequency.value = 1400;
      master.connect(lpFilter);
      lpFilter.connect(ctx.destination);
    }
    return ctx;
  }
  function pluck(freq, at, dur, vol, type) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(1e-4, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.02);
    g.gain.exponentialRampToValueAtTime(1e-4, at + dur);
    o.connect(g); g.connect(master); o.start(at); o.stop(at + dur + 0.05);
  }
  function playChord(chord) {
    if (!ctx || !master) return;
    const T = curTrack(), now = ctx.currentTime, secs = T.sec, hz = chord.map(midiHz);
    if (T.arp) {
      const order = [0, 1, 2, 3, 2, 1, 2, 3], stepT = secs / order.length;
      order.forEach((ix, i) => pluck(hz[ix] * 2, now + i * stepT, stepT * 2.2, 0.11, T.wave[0]));
      pluck(hz[0], now, secs + 0.4, 0.07, "sine");
    } else {
      hz.forEach((freq, i) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = T.wave[i % 2]; osc.frequency.value = freq; osc.detune.value = (Math.random() - 0.5) * 8;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.16, now + Math.min(1.6, secs * 0.2));
        gain.gain.linearRampToValueAtTime(1e-4, now + secs + 0.6);
        osc.connect(gain); gain.connect(master); osc.start(now); osc.stop(now + secs + 0.7);
      });
    }
    if (T.bass) pluck(hz[0] / 2, now, Math.min(secs, 3), 0.2, "sine");
    pluck(hz[Math.floor(Math.random() * hz.length)] * 2, now + secs * 0.38, 1.6, 0.12, "sine");
  }
  function startCrackle() {
    if (!ctx || !master) return;
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() < 15e-4 ? (Math.random() - 0.5) * 0.6 : 0;
    noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const g = ctx.createGain(); g.gain.value = 0.5; noise.connect(g); g.connect(master); noise.start();
  }
  // Tiếng mưa: nền "xào xạc" từ nhiễu lọc + hạt mưa lách tách ngẫu nhiên + sấm xa thỉnh thoảng (tạo trực tiếp, không dùng file).
  function noiseBuf(sec) {
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18; }
    return buf;
  }
  function startRain() {
    const bed = ctx.createBufferSource(); bed.buffer = noiseBuf(6); bed.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 350;
    const bp = ctx.createBiquadFilter(); bp.type = "peaking"; bp.frequency.value = 3200; bp.gain.value = 5; bp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = 0.9;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.12; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    bed.connect(hp); hp.connect(bp); bp.connect(g); g.connect(master); bed.start();
    rainNodes.push(bed, lfo);
    const drop = noiseBuf(0.12);
    rainTimer = window.setInterval(() => {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        if (Math.random() < 0.45) continue;
        const src = ctx.createBufferSource(); src.buffer = drop;
        const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800 + Math.random() * 5200; f.Q.value = 2 + Math.random() * 4;
        const gg = ctx.createGain(), at = ctx.currentTime + Math.random() * 0.08, dur = 0.015 + Math.random() * 0.04;
        gg.gain.setValueAtTime(0.12 + Math.random() * 0.25, at); gg.gain.exponentialRampToValueAtTime(1e-4, at + dur);
        src.connect(f); f.connect(gg); gg.connect(master); src.start(at, Math.random() * 0.05); src.stop(at + dur + 0.02);
      }
    }, 70);
    const thunder = () => {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf(5);
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 140 + Math.random() * 80;
      const gg = ctx.createGain(), at = ctx.currentTime + 0.1;
      gg.gain.setValueAtTime(1e-4, at); gg.gain.linearRampToValueAtTime(0.5, at + 0.9); gg.gain.exponentialRampToValueAtTime(1e-4, at + 4.6);
      src.connect(f); f.connect(gg); gg.connect(master); src.start(at); src.stop(at + 5);
      thunderTimer = window.setTimeout(thunder, 22000 + Math.random() * 30000);
    };
    thunderTimer = window.setTimeout(thunder, 12000 + Math.random() * 15000);
  }
  function stopRain() {
    if (rainTimer !== void 0) window.clearInterval(rainTimer);
    if (thunderTimer !== void 0) window.clearTimeout(thunderTimer);
    rainTimer = thunderTimer = void 0;
    rainNodes.forEach((n) => { try { n.stop(); } catch { } });
    rainNodes = [];
  }
  async function start() {
    const c = ensure();
    if (c.state === "suspended") await c.resume();
    if (playing) return true;
    playing = true; step = 0;
    const T = curTrack();
    if (lpFilter) lpFilter.frequency.value = T.lp;
    if (T.rain) { startRain(); return true; }
    playChord(T.chords[step]);
    if (T.crackle) startCrackle();
    timer = window.setInterval(() => { step = (step + 1) % T.chords.length; playChord(T.chords[step]); }, T.sec * 1e3);
    return true;
  }
  function stop() {
    playing = false;
    if (timer !== void 0) window.clearInterval(timer);
    timer = void 0;
    if (noise) { try { noise.stop(); } catch { } noise = null; }
    stopRain();
  }
  async function pickTrack(i) {
    trackIdx = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
    if (isPlaying()) { stop(); if (state.settings.sound) { setVolume(ui.volume / 100); await start(); } }
    renderEntertainment();
  }
  function setVolume(v) {
    if (master) master.gain.value = Math.min(1, Math.max(0, v));
  }
  var sfxOn = true;
  function setSfxEnabled(on) {
    sfxOn = on;
  }
  function blip(c, freq, at, dur, type, vol) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(1e-4, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 8e-3);
    g.gain.exponentialRampToValueAtTime(1e-4, at + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }
  function sfx(kind) {
    if (!sfxOn || !isSupported()) return;
    const ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive) return;
    try {
      const c = baseCtx();
      if (c.state === "suspended") void c.resume();
      const t = c.currentTime;
      if (kind === "click") {
        blip(c, 720, t, 0.06, "triangle", 0.12);
      } else if (kind === "poke") {
        blip(c, 420, t, 0.06, "square", 0.08);
        blip(c, 840, t + 0.05, 0.1, "triangle", 0.13);
        blip(c, 1260, t + 0.12, 0.14, "sine", 0.1);
      } else if (kind === "pokeback") {
        blip(c, 988, t, 0.08, "sine", 0.1);
        blip(c, 740, t + 0.09, 0.14, "sine", 0.1);
      } else if (kind === "toggle") {
        blip(c, 520, t, 0.07, "sine", 0.14);
        blip(c, 780, t + 0.06, 0.08, "sine", 0.14);
      } else if (kind === "coin") {
        blip(c, 988, t, 0.09, "square", 0.07);
        blip(c, 1319, t + 0.08, 0.28, "square", 0.07);
      } else if (kind === "right" || kind.startsWith("right-preview-")) {
        const preset = kind.startsWith("right-preview-") ? kind.slice(-1) : (localStorage.getItem("windtp-sfx-right") || "1");
        if (preset === "1") {
          [659.25, 880].forEach((f, i) => blip(c, f, t + i * 0.09, 0.16, "sine", 0.13));
        } else if (preset === "2") {
          [523.25, 659.25, 783.99].forEach((f, i) => blip(c, f, t + i * 0.07, 0.16, "triangle", 0.14));
        } else {
          [784, 988, 1175].forEach((f, i) => blip(c, f, t + i * 0.065, 0.11, "sine", 0.12));
        }
      } else if (kind === "wrong" || kind.startsWith("wrong-preview-")) {
        const preset = kind.startsWith("wrong-preview-") ? kind.slice(-1) : (localStorage.getItem("windtp-sfx-wrong") || "1");
        if (preset === "1") {
          blip(c, 220, t, 0.18, "sawtooth", 0.08); blip(c, 165, t + 0.12, 0.24, "sawtooth", 0.08);
        } else if (preset === "2") {
          blip(c, 300, t, 0.055, "triangle", 0.09); blip(c, 240, t + 0.075, 0.055, "triangle", 0.09);
        } else {
          blip(c, 392, t, 0.10, "square", 0.055); blip(c, 294, t + 0.1, 0.17, "square", 0.055);
        }
      } else {
        blip(c, 220, t, 0.18, "sawtooth", 0.08);
        blip(c, 165, t + 0.12, 0.24, "sawtooth", 0.08);
      }
    } catch {
    }
  }
  function speechSupported() {
    return typeof window !== "undefined" && !!(window.speechSynthesis || window.webkitSpeechSynthesis) &&
      !!(window.SpeechSynthesisUtterance || window.webkitSpeechSynthesisUtterance);
  }
  function speak(text, lang) {
    const phrase = String(text || "").trim();
    if (!phrase) return;
    const wantedLang = lang || "en-US";
    const langCode = wantedLang.toLowerCase().split("-")[0];
    const remoteSpeak = () => {
      try {
        const url = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" +
          encodeURIComponent(langCode) + "&q=" + encodeURIComponent(phrase);
        if (window.__windtpTtsAudio) { window.__windtpTtsAudio.pause(); window.__windtpTtsAudio = null; }
        const audio = new Audio(url);
        window.__windtpTtsAudio = audio;
        audio.play().catch(() => {});
      } catch {}
    };
    const synth = window.speechSynthesis || window.webkitSpeechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance || window.webkitSpeechSynthesisUtterance;
    if (!synth || !Utterance) { remoteSpeak(); return; }
    try {
      synth.cancel();
      let completed = false;
      const say = () => {
        if (completed) return;
        const voices = synth.getVoices ? synth.getVoices() : [];
        const wanted = wantedLang.toLowerCase();
        const prefix = wanted.split("-")[0];
        const voice = voices.find(v => String(v.lang || "").toLowerCase() === wanted) ||
          voices.find(v => String(v.lang || "").toLowerCase().split("-")[0] === prefix);
        if (!voice) { completed = true; remoteSpeak(); return; }
        completed = true;
        const u = new Utterance(phrase);
        u.lang = wantedLang; u.voice = voice; u.rate = 0.88;
        u.onerror = () => remoteSpeak();
        synth.speak(u);
        if (typeof synth.resume === "function") synth.resume();
      };
      if (synth.getVoices && synth.getVoices().length) say();
      else {
        const onVoices = () => say();
        if (synth.addEventListener) synth.addEventListener("voiceschanged", onVoices, { once: true });
        else if (synth.onvoiceschanged !== undefined) {
          const previous = synth.onvoiceschanged;
          synth.onvoiceschanged = () => { try { if (typeof previous === "function") previous.call(synth); } finally { onVoices(); } };
        }
        setTimeout(() => { if (!completed) say(); }, 900);
      }
    } catch { remoteSpeak(); }
  }

  // src/util.ts
  function $(sel, root = document) {
    return root.querySelector(sel);
  }
  function $$(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  var fmt = (n) => Math.round(n).toLocaleString("en-US");
  function norm(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
  }
  var pad = (n) => String(n).padStart(2, "0");
  function dateKey(d = /* @__PURE__ */ new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function yesterdayKey() {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() - 1);
    return dateKey(d);
  }
  function fmtDateTime(ts) {
    const d = new Date(ts);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} \u2022 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function timeAgo(ts) {
    const diff = Math.max(0, Date.now() - ts);
    const min = Math.floor(diff / 6e4);
    if (min < 1) return "V\u1EEBa xong";
    if (min < 60) return `${min} ph\xFAt tr\u01B0\u1EDBc`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} gi\u1EDD tr\u01B0\u1EDBc`;
    return `${Math.floor(h / 24)} ng\xE0y tr\u01B0\u1EDBc`;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  var counter = 0;
  function uid(prefix) {
    counter += 1;
    return `${prefix}-${Date.now().toString(36)}${counter}`;
  }
  function initial(name) {
    const parts = name.trim().split(/\s+/);
    return (parts[parts.length - 1] || "?").charAt(0).toUpperCase();
  }
  var AVATAR_TONES = ["from-sky-400 to-blue-500", "from-rose-400 to-pink-500", "from-emerald-400 to-teal-500", "from-amber-400 to-orange-500", "from-violet-400 to-indigo-500"];
  function avatar(name, size = "w-10 h-10") {
    let h = 0;
    for (const c of name) h = h * 31 + c.charCodeAt(0) >>> 0;
    return `<div class="${size} shrink-0 rounded-full bg-gradient-to-tr ${AVATAR_TONES[h % AVATAR_TONES.length]} text-white font-extrabold text-sm flex items-center justify-center keep-white">${esc(initial(name))}</div>`;
  }
  function thumb(src, emoji, cls, art) {
    const img = src ? `<img src="${esc(src)}" alt="" loading="lazy" class="absolute inset-0 w-full h-full object-cover" onerror="this.remove()">` : "";
    const body = art ? `<span class="ws-art">${art}</span>` : `<span>${esc(emoji)}</span>`;
    return `<div class="relative overflow-hidden bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center text-3xl ${cls}">${body}${img}</div>`;
  }

  // src/store.ts
  var KEY = "windtp-super-app-v2";
  var VERSION = 4;
  function freshDaily(day) {
    return { day, checkedIn: false, lessons: [], games: 0, posts: 0, purchases: 0, bigOrder: false, bigOrderAmount: 0, bigOrderCurrency: "", gameWins: 0, claimed: [], certRewards: [] };
  }
  function seed() {
    const now = Date.now();
    const today = dateKey();
    return {
      version: VERSION,
      userName: "Nguy\u1EC5n V\u0103n A",
      balance: 0,
      history: [],
      cart: {},
      owned: [],
      lang: null,
      known: {},
      daily: freshDaily(today),
      streak: 0,
      lastCheckIn: "",
      lastLogin: today,
      firstTopupDone: false,
      posts: seedPosts(now),
      listings: [],
      saved: [],
      reminders: [],
      notices: [
        { id: "n-1", icon: "\u{1F381}", title: "Ch\xE0o m\u1EEBng b\u1EA1n \u0111\u1EBFn v\u1EDBi WINDTP! Ho\xE0n th\xE0nh nhi\u1EC7m v\u1EE5 m\u1ED7i ng\xE0y \u0111\u1EC3 nh\u1EADn Xu.", ts: now - 5 * 6e4, read: false },
        { id: "n-2", icon: "\u{1F3AF}", title: "Nhi\u1EC7m v\u1EE5 h\u1EB1ng ng\xE0y \u0111\xE3 s\u1EB5n s\xE0ng, v\xE0o Ti\u1EC7n \xEDch > Nhi\u1EC7m v\u1EE5 \u0111\u1EC3 nh\u1EADn Xu.", ts: now - 30 * 6e4, read: false }
      ],
      invited: [],
      settings: { dark: false, sound: true, sfx: true, push: true, gender: "", birth: "", currency: ((Intl.DateTimeFormat().resolvedOptions().timeZone || "").includes("Tokyo") ? "JPY" : ((Intl.DateTimeFormat().resolvedOptions().timeZone || "").includes("Seoul") ? "KRW" : "VND")) },
      orders: [],
      customCats: [],
      loginStreak: 1,
      cultivationLevel: 0,
      cultivationLastPenalty: "",
      streakRewardsClaimed: [],
      avatarId: "default",
      frameId: "none",
      ownedAvatars: [],
      ownedFrames: [],
      premiumUntil: 0,
      chips: 0,
      chipsDelta: 0,
      courseAccess: {},
      social: { challenges: [], record: {}, pokes: {}, points: 0 }
    };
  }
  // Số dư, lịch sử, quyền sở hữu và Premium chỉ do máy chủ cấp (economy-api.js); mọi giá trị cùng tên đọc từ localStorage bị bỏ.
  function scrubEconomy(o) {
    const d = Number(o.chipsDelta);
    // Cấu hình cửa hàng giờ do máy chủ giữ; bản cục bộ cũ chỉ được giữ lại để admin chuyển lên máy chủ một lần.
    if ((o.customProducts || []).length || Object.keys(o.productEdits || {}).length || (o.hiddenProducts || []).length || (o.customCats || []).length) window.__legacyStore = { customProducts: o.customProducts || [], productEdits: o.productEdits || {}, hiddenProducts: o.hiddenProducts || [], customCats: o.customCats || [] };
    o.customProducts = []; o.productEdits = {}; o.hiddenProducts = []; o.customCats = [];
    o.balance = 0; o.history = []; o.owned = []; o.premiumUntil = 0; o.courseAccess = {}; o.chips = 0; o.posts = []; o.listings = []; o.customTasks = []; o.taskClaims = []; o.fbShares = []; o.payouts = []; o.orders = []; o.credits = [];
    o.chipsDelta = Number.isFinite(d) ? Math.max(-1e9, Math.min(1e9, Math.floor(d))) : 0;
    return o;
  }
  var SHARED = ["postsCleared", "refRewarded", "posts", "listings", "orders", "customProducts", "customCats", "customTasks", "taskClaims", "payouts", "credits", "productEdits", "fbShares"];
  function ukey(e) { return KEY + "::u::" + String(e || "").toLowerCase(); }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.version === "number" && parsed.version >= 2) {
          const base = seed(); let personal = parsed, shared = {};
          if (parsed.shared) { shared = parsed.shared; personal = {}; const a = parsed.account; if (a && a.email) { try { personal = JSON.parse(localStorage.getItem(ukey(a.email)) || "{}"); } catch { } } }
          else SHARED.forEach((k) => { if (parsed[k] !== undefined) shared[k] = parsed[k]; });
          return scrubEconomy({ ...base, ...personal, ...shared, account: parsed.account || null, version: VERSION, settings: { ...base.settings, ...personal.settings }, daily: { ...base.daily, ...personal.daily } });
        }
      }
    } catch {
    }
    return seed();
  }
  var state = load();
  var listeners = [];
  function subscribe(fn) {
    listeners.push(fn);
  }
  function save() {
    try {
      const shared = {}, mine = {};
      Object.keys(state).forEach((k) => { if (SHARED.includes(k)) shared[k] = state[k]; else if (k !== "account") mine[k] = state[k]; });
      localStorage.setItem(KEY, JSON.stringify({ version: state.version, account: state.account, shared }));
      if (state.account && state.account.email) localStorage.setItem(ukey(state.account.email), JSON.stringify(mine));
      return true;
    } catch {
      return false;
    }
  }
  var saveWarnedAt = 0;
  function commit() {
    guardAdminCosmetics();
    if (!save() && Date.now() - saveWarnedAt > 30e3) {
      saveWarnedAt = Date.now();
      window.dispatchEvent(new CustomEvent("windtp:save-failed"));
    }
    listeners.forEach((fn) => fn());
  }
  function resetAll() {
    try {
      localStorage.removeItem(KEY);
    } catch {
    }
    Object.assign(state, seed());
    commit();
  }
  function notify(icon, title) {
    state.notices.unshift({ id: uid("n"), icon, title, ts: Date.now(), read: false });
    if (state.notices.length > 40) state.notices.length = 40;
  }
  // Trình duyệt không được tự cộng/trừ Xu: mọi thay đổi đi qua máy chủ (economy-api.js).
  function earn() { throw new Error("Xu do m\u00E1y ch\u1EE7 qu\u1EA3n l\u00FD"); }
  function spend() { throw new Error("Xu do m\u00E1y ch\u1EE7 qu\u1EA3n l\u00FD"); }
  const CULTIVATION_RANKS = [
    { name: "Luyện Khí", badge: "炼", days: 0 },
    { name: "Trúc Cơ", badge: "筑", days: 1 },
    { name: "Kim Đan", badge: "丹", days: 7 },
    { name: "Nguyên Anh", badge: "婴", days: 15 },
    { name: "Hóa Thần", badge: "神", days: 30 },
    { name: "Luyện Hư", badge: "虚", days: 60 },
    { name: "Hợp Thể", badge: "合", days: 120 },
    { name: "Đại Thừa", badge: "乘", days: 240 },
    { name: "Độ Kiếp", badge: "劫", days: 365 }
  ];
  function realmGlyph(i, size, big) {
    const r = CULTIVATION_RANKS[i] || CULTIVATION_RANKS[0];
    return `<span class="rk rk${i}${big ? " rk-big" : ""}" style="font-size:${size}px">${r.badge}</span>`;
  }
  function cultivationIndex() {
    return Math.max(0, Math.min(CULTIVATION_RANKS.length - 1, Number(state.cultivationLevel || 0)));
  }
  function cultivationRank() {
    return CULTIVATION_RANKS[Math.max(0, Math.min(CULTIVATION_RANKS.length - 1, Number(state.cultivationLevel || 0)))];
  }
  function showRealmCelebration(rank, first = false) {
    if (!document.body) return;
    document.querySelector(".realm-celebration")?.remove();
    const layer = document.createElement("div");
    layer.className = "realm-celebration";
    layer.innerHTML = `<div class="realm-celebration-card"><span class="realm-spark">✦</span><span class="realm-spark">✧</span><span class="realm-spark">✨</span><span class="realm-spark">🌟</span><div style="margin:2px auto 10px;min-height:84px;display:grid;place-items:center">${realmGlyph(CULTIVATION_RANKS.indexOf(rank), 76, true)}</div><p style="font-size:11px;letter-spacing:.22em;font-weight:900;color:#fde68a">${first ? "BẮT ĐẦU TU TIÊN" : "ĐỘT PHÁ CẢNH GIỚI"}</p><h2 style="font-size:27px;font-weight:1000;margin:7px 0 9px">${rank.name}</h2><p style="font-size:13px;color:#f5d0fe">${first ? "Bạn đã nhận cảnh giới đầu tiên! Hành trình tu luyện bắt đầu." : "Chúc mừng đạo hữu! Linh lực bùng nổ, cảnh giới đã tăng tiến."}</p>${first ? "" : `<div style="margin:16px 0 4px;display:flex;flex-direction:column;align-items:center;gap:10px"><div style="padding:10px">${renderPfp(state.userName, state.avatarId, "r-" + CULTIVATION_RANKS.indexOf(rank), 92)}</div><p style="font-size:12px;font-weight:800;color:#fde68a">🎁 Khung avatar mới: ${frameById("r-" + CULTIVATION_RANKS.indexOf(rank)).name}</p></div>`}<p style="margin:12px 0 16px;font-size:26px">🌈 ⚡ 🪷</p><button id="realm-celebration-close" style="background:linear-gradient(90deg,#fef08a,#fbbf24);color:#581c87;border-radius:14px;padding:10px 24px;font-weight:900">Tiếp tục tu luyện</button></div>`;
    document.body.appendChild(layer);
    layer.querySelector("#realm-celebration-close").addEventListener("click", () => layer.remove());
    layer.addEventListener("click", (e) => { if (e.target === layer) layer.remove(); });
    window.setTimeout(() => layer.isConnected && layer.remove(), 9000);
  }
  function cultivationModal() {
    const current = Number(state.cultivationLevel || 0);
    return `${modalHead("🌌 Hệ thống cảnh giới tu tiên")}<div class="p-4 space-y-3 text-xs"><div class="rounded-2xl p-3 text-center text-white" style="background:linear-gradient(120deg,#312e81,#7e22ce,#be185d)"><div style="min-height:56px;display:grid;place-items:center">${realmGlyph(cultivationIndex(), 46, true)}</div><p class="text-lg font-black">${cultivationRank().name}</p><p>Chuỗi đăng nhập hiện tại: ${Number(state.loginStreak || 1)} ngày</p></div><div class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800"><b>⚠️ Quy định tụt cảnh giới</b><p class="mt-1">Nếu không đăng nhập liên tiếp 3 ngày trở lên, bạn sẽ bị hạ 1 cảnh giới. Đăng nhập trở lại sẽ bắt đầu tính chuỗi mới.</p></div><div class="space-y-2">${CULTIVATION_RANKS.map((r,i)=>`<div class="realm-row flex items-center gap-3 rounded-xl border ${i===current?'realm-row-now':i<current?'realm-row-done border-slate-200 bg-white':'realm-row-lock border-slate-200 bg-white'} p-3"${i===current?' aria-current="true"':''}><div class="grid place-items-center shrink-0" style="width:44px;height:44px">${realmGlyph(i, 28, false)}</div><div class="flex-1 min-w-0"><p class="font-black text-sm">${r.name} ${i===current?'<span class="realm-now-pill">★ Hiện tại</span>':''}</p><p class="text-slate-500">${i===0?'Cảnh giới khởi đầu':`Cần đăng nhập liên tục ${r.days} ngày`}</p></div><span class="text-base">${i<current?'✅':i===current?'🌟':'🔒'}</span></div>`).join("")}</div><p class="text-[10px] text-slate-500">Mốc tối đa: Độ Kiếp sau 365 ngày (1 năm) đăng nhập liên tục.</p><button data-action="back-settings-from-realms" class="w-full rounded-xl border border-slate-200 py-2.5 font-bold">Quay lại cài đặt</button></div>`;
  }
  function updateCultivation() {
    const today = dateKey();
    const last = state.lastLogin || today;
    if (last === today) {
      if (state.cultivationLevel == null) state.cultivationLevel = 0;
      return;
    }
    const daysAway = Math.floor((new Date(today + "T00:00:00").getTime() - new Date(last + "T00:00:00").getTime()) / 86400000);
    if (daysAway >= 3 && state.cultivationLastPenalty !== today) {
      state.cultivationLevel = Math.max(0, Number(state.cultivationLevel || 0) - 1);
      state.cultivationLastPenalty = today;
      if ((frameById(state.frameId).realm ?? -1) > state.cultivationLevel) state.frameId = "r-" + state.cultivationLevel;
      state.loginStreak = 1;
      notify("🧘", `Bế quan gián đoạn ${daysAway} ngày: cảnh giới tụt 1 cấp, hiện tại ${cultivationRank().name}.`);
    } else {
      state.loginStreak = daysAway === 1 ? Number(state.loginStreak || 1) + 1 : 1;
    }
    state.lastLogin = today;
    while (state.cultivationLevel < CULTIVATION_RANKS.length - 1 && state.loginStreak >= CULTIVATION_RANKS[state.cultivationLevel + 1].days) {
      state.cultivationLevel += 1;
      state.frameId = "r-" + state.cultivationLevel;
      notify("🏅", `Chúc mừng! Bạn đã thăng cảnh giới ${cultivationRank().name} và nhận khung avatar ${frameById(state.frameId).name}.`);
      showRealmCelebration(cultivationRank(), false);
    }
    save();
  }
  function rollDay() {
    const today = dateKey();
    if (state.daily.day !== today) state.daily = freshDaily(today);
    if (state.lastLogin !== today) updateCultivation();
    if (state.cultivationLevel == null) state.cultivationLevel = 0;
    if (!state.cultivationWelcomeShown) {
      state.cultivationWelcomeShown = true;
      window.setTimeout(() => showRealmCelebration(cultivationRank(), true), 500);
      save();
    }
  }
  function checkIn() {
    if (state.daily.checkedIn) return false;
    state.daily.checkedIn = true;
    state.streak = state.lastCheckIn === yesterdayKey() ? state.streak + 1 : 1;
    state.lastCheckIn = dateKey();
    return true;
  }
  function streakProgress() {
    return Math.min(Number(state.loginStreak || 0), Number(state.streak || 0));
  }
  function completeLesson(id) {
    if (!state.daily.lessons.includes(id)) state.daily.lessons.push(id);
  }
  function tasks() {
    const d = state.daily;
    return [
      { id: "t-checkin", icon: "\u{1F4C5}", title: "\u0110i\u1EC3m danh h\xF4m nay", reward: 200, progress: () => d.checkedIn ? 1 : 0, goal: 1, hint: state.streak > 0 ? `Chu\u1ED7i ${state.streak} ng\xE0y li\xEAn ti\u1EBFp` : "B\u1EA5m \u0111i\u1EC3m danh \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u chu\u1ED7i ng\xE0y" },
      { id: "t-lessons", icon: "\u{1F4D6}", title: "Ho\xE0n th\xE0nh 3 b\xE0i h\u1ECDc", reward: 200, progress: () => d.lessons.length, goal: 3, hint: "H\u1ECDc t\u1EEB v\u1EF1ng, ng\u1EEF ph\xE1p, luy\u1EC7n t\u1EADp ho\u1EB7c gi\u1EA3i \u0111\u1EC1" },
      { id: "t-duel", icon: "⚔️", title: "Thách đấu 1 người bạn", reward: 200, progress: () => { const t0 = new Date(); t0.setHours(0, 0, 0, 0); return socialState().challenges.filter((c) => c.dir === "out" && c.ts >= t0.getTime()).length; }, goal: 1, hint: "Cần WIND Premium để gửi lời thách đấu" },
      { id: "t-shop", icon: "\u{1F6CD}\uFE0F", title: "Mua h\u00E0ng trong WIND Shop", reward: SHOP_REWARD, chips: 10000, progress: () => d.purchases, goal: 1, hint: "Thanh to\u00E1n th\u00E0nh c\u00F4ng \u0111\u01A1n h\u00E0ng b\u1EA5t k\u1EF3 trong WIND Shop" },
      { id: "t-bigshop", icon: "\u{1F4B0}", title: "Chi ti\u00EAu \u0111\u1EA1t m\u1EE9c \u01B0u \u0111\u00E3i", reward: 40000, chips: 40000, progress: () => Number(d.bigOrderAmount || 0), goal: BIG_THR[d.bigOrderCurrency || state.settings.currency], currencyProgress: d.bigOrderCurrency || state.settings.currency, hint: Number(d.bigOrderAmount || 0) > 0 ? `Đạt ${money(BIG_THR[d.bigOrderCurrency || state.settings.currency], d.bigOrderCurrency || state.settings.currency)} chi tiêu để nhận thưởng` : "Mua hàng trong WIND Store để bắt đầu tính chi tiêu" },
    ];
  }

  // src/cosmetics.ts
  var STREAK_DAYS = 7;
  var AVATARS = [
    { id: "default", name: "Chữ cái tên", emoji: "", bg: "linear-gradient(135deg,#38bdf8,#3b82f6)", price: 0, unlock: "free" },
