(() => {
  // Phát âm dùng chung (Tra cứu từ vựng, trình xem nét, trắc nghiệm...): chọn giọng đọc tốt nhất của thiết bị,
  // chia câu dài thành đoạn ngắn, hỗ trợ đọc chậm và tự chuyển sang giọng trực tuyến khi máy thiếu giọng phù hợp.
  const LANG = { vi: "vi-VN", en: "en-US", ko: "ko-KR", ja: "ja-JP", zh: "zh-CN", "zh-CN": "zh-CN", fr: "fr-FR", de: "de-DE", es: "es-ES" };
  const NAME = { vi: "tiếng Việt", en: "tiếng Anh", ko: "tiếng Hàn", ja: "tiếng Nhật", zh: "tiếng Trung", fr: "tiếng Pháp", de: "tiếng Đức", es: "tiếng Tây Ban Nha" };
  const RATE = { normal: 0.9, slow: 0.6 };
  const MIN_LOCAL_SCORE = 45;
  let gen = 0;

  const norm = (l) => String(l || "").replace("_", "-").toLowerCase();
  const fullLang = (l) => LANG[l] || l || "vi-VN";
  const synthOf = () => window.speechSynthesis || window.webkitSpeechSynthesis || null;
  const utterOf = () => window.SpeechSynthesisUtterance || window.webkitSpeechSynthesisUtterance || null;

  /** Điểm chất lượng của một giọng đọc với ngôn ngữ cần đọc; càng cao càng tốt, dưới 20 là không cùng ngôn ngữ. */
  function score(v, wanted) {
    const vl = norm(v.lang), wl = norm(wanted), name = String(v.name || "");
    let s = 0;
    if (vl === wl) s += 50;
    else if (vl.split("-")[0] === wl.split("-")[0]) s += 20;
    else return 0;
    // Tiếng Trung: giọng đại lục hơn giọng Đài Loan / Hồng Kông khi cần zh-CN.
    if (wl === "zh-cn" && /^zh-(tw|hk)/.test(vl)) s -= 12;
    if (/natural|neural|online/i.test(name)) s += 30;
    if (/google/i.test(name)) s += 25;
    if (/enhanced|premium|siri/i.test(name)) s += 20;
    if (/espeak|compact|festival/i.test(name)) s -= 40;
    if (v.localService === false) s += 5;
    if (v.default) s += 3;
    return s;
  }
  function bestVoice(lang) {
    const synth = synthOf();
    if (!synth || !synth.getVoices) return null;
    const wanted = fullLang(lang);
    let best = null, top = 0;
    synth.getVoices().forEach((v) => { const s = score(v, wanted); if (s > top) { top = s; best = v; } });
    return best ? { voice: best, score: top } : null;
  }
  /** true nếu thiết bị có giọng đọc đủ tốt cho ngôn ngữ này (dùng để quyết định có cần giọng trực tuyến hay không). */
  function hasGoodVoice(lang) { const b = bestVoice(lang); return !!b && b.score >= MIN_LOCAL_SCORE; }

  /** Chia văn bản thành các đoạn ngắn, ưu tiên cắt ở dấu câu để giọng đọc không bị đứt hơi. */
  function chunks(text, max) {
    const parts = String(text).split(/(?<=[.!?。！？、，,;；:：\n])\s*/u).filter((p) => p.trim());
    const out = []; let cur = "";
    parts.forEach((p) => {
      if (cur && (cur + " " + p).length > max) { out.push(cur); cur = p; } else cur = cur ? cur + " " + p : p;
      while (cur.length > max) { out.push(cur.slice(0, max)); cur = cur.slice(max); }
    });
    if (cur.trim()) out.push(cur);
    return out;
  }

  function stop() {
    gen++;
    const synth = synthOf();
    try { if (synth) synth.cancel(); } catch (e) { }
    if (window.__windtpTtsAudio) { try { window.__windtpTtsAudio.pause(); } catch (e) { } window.__windtpTtsAudio = null; }
  }

  function speakRemote(parts, lang, rate, myGen, opts) {
    const code = fullLang(lang) === "zh-CN" ? "zh-CN" : fullLang(lang).split("-")[0];
    let i = 0;
    const next = () => {
      if (myGen !== gen || i >= parts.length) return;
      const url = "https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&tl=" + encodeURIComponent(code) +
        "&ttsspeed=" + (rate < 0.75 ? "0.3" : "1") + "&q=" + encodeURIComponent(parts[i++]);
      const audio = new Audio();
      audio.referrerPolicy = "no-referrer";
      window.__windtpTtsAudio = audio;
      audio.onended = next;
      audio.onerror = () => { if (myGen === gen && opts.onError) opts.onError("Không tải được âm thanh. Hãy kiểm tra kết nối Internet rồi thử lại."); };
      audio.src = url;
      audio.play().catch(() => { if (myGen === gen && opts.onError) opts.onError("Không phát được âm thanh. Hãy kiểm tra kết nối Internet và âm lượng media."); });
    };
    next();
  }

  function speakLocal(parts, voice, lang, rate, myGen, opts) {
    const synth = synthOf(), Utt = utterOf();
    let i = 0, failed = false;
    const next = () => {
      if (myGen !== gen || failed || i >= parts.length) return;
      const u = new Utt(parts[i++]);
      u.lang = voice.lang || fullLang(lang); u.voice = voice; u.rate = rate; u.pitch = 1; u.volume = 1;
      u.onend = next;
      u.onerror = (e) => {
        if (myGen !== gen || (e && (e.error === "canceled" || e.error === "interrupted"))) return;
        failed = true;
        speakRemote(parts, lang, rate, myGen, opts);
      };
      synth.speak(u);
      if (typeof synth.resume === "function") synth.resume();
    };
    next();
  }

  /**
   * Đọc `text` bằng ngôn ngữ `lang` (vi, en, ko, ja, zh-CN, fr, de, es hoặc mã đầy đủ như ko-KR).
   * opts: { slow: đọc chậm, onNote(msg): thông báo nhẹ, onError(msg): lỗi }.
   */
  function speak(text, lang, opts) {
    opts = opts || {};
    const phrase = String(text || "").trim();
    if (!phrase) return;
    stop();
    const myGen = gen, rate = opts.slow ? RATE.slow : RATE.normal;
    const parts = chunks(phrase, 160);
    const synth = synthOf(), Utt = utterOf();
    const run = () => {
      if (myGen !== gen) return;
      const best = synth && Utt ? bestVoice(lang) : null;
      if (best && best.score >= MIN_LOCAL_SCORE) { speakLocal(parts, best.voice, lang, rate, myGen, opts); return; }
      const key = fullLang(lang).split("-")[0];
      if (opts.onNote) opts.onNote("Thiết bị chưa có giọng đọc " + (NAME[key] || "phù hợp") + " đủ rõ, đang dùng giọng trực tuyến (cần Internet).");
      if (best && opts.localFallback !== false) {
        // Có giọng cùng ngôn ngữ nhưng chất lượng thấp: vẫn dùng làm phương án cuối nếu giọng trực tuyến lỗi.
        const prev = opts.onError;
        opts = Object.assign({}, opts, { onError: (m) => { if (myGen !== gen) return; if (prev) prev(m); speakLocal(parts, best.voice, lang, rate, myGen, { onError: prev }); } });
      }
      speakRemote(parts, lang, rate, myGen, opts);
    };
    if (synth && synth.getVoices && !synth.getVoices().length) {
      let done = false;
      const once = () => { if (done) return; done = true; run(); };
      if (synth.addEventListener) synth.addEventListener("voiceschanged", once, { once: true });
      setTimeout(once, 900);
    } else run();
  }

  window.WindtpSpeech = { speak, stop, hasGoodVoice, langName: (l) => NAME[fullLang(l).split("-")[0]] || "" };
})();
