
(() => {
  const $ = (id) => document.getElementById(id);
  const langNames = {vi:"Tiếng Việt",en:"Tiếng Anh",ko:"Tiếng Hàn",ja:"Tiếng Nhật","zh-CN":"Tiếng Trung",fr:"Tiếng Pháp",de:"Tiếng Đức",es:"Tiếng Tây Ban Nha"};
  const speechLang = {vi:"vi-VN",en:"en-US",ko:"ko-KR",ja:"ja-JP","zh-CN":"zh-CN",fr:"fr-FR",de:"de-DE",es:"es-ES"};
  let lastTranslation = ""; let busy = false;
  function showError(message) { const e=$("vocab-error"); if(e){e.textContent=message;e.classList.remove("hidden");} }
  function clearError(){const e=$("vocab-error");if(e){e.textContent="";e.classList.add("hidden");}}
  function speak(text, lang) {
    const phrase = String(text || "").trim();
    clearError();
    if (!phrase) { showError("Bạn hãy nhập từ/câu hoặc dịch trước khi bấm nghe."); return; }
    const targetLang = speechLang[lang] || lang || "vi-VN";
    const langCode = targetLang.toLowerCase().split("-")[0];
    const remoteSpeak = () => {
      try {
        const url = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" +
          encodeURIComponent(langCode) + "&q=" + encodeURIComponent(phrase);
        if (window.__windtpTtsAudio) { window.__windtpTtsAudio.pause(); window.__windtpTtsAudio = null; }
        const audio = new Audio(url);
        window.__windtpTtsAudio = audio;
        audio.onerror = () => showError("Không tải được âm thanh. Hãy kiểm tra kết nối Internet rồi thử lại.");
        audio.play().catch(() => showError("Không phát được âm thanh. Hãy kiểm tra kết nối Internet và âm lượng media."));
      } catch { showError("Không thể phát âm thanh trong trình duyệt này."); }
    };
    const synth = window.speechSynthesis || window.webkitSpeechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance || window.webkitSpeechSynthesisUtterance;
    if (!synth || !Utterance) { remoteSpeak(); return; }
    try {
      synth.cancel();
      let completed = false;
      const startSpeaking = () => {
        if (completed) return;
        const voices = synth.getVoices ? synth.getVoices() : [];
        const wanted = targetLang.toLowerCase(), prefix = wanted.split("-")[0];
        const voice = voices.find(v => (v.lang || "").toLowerCase() === wanted) ||
          voices.find(v => (v.lang || "").toLowerCase().split("-")[0] === prefix);
        if (!voice) { completed = true; remoteSpeak(); return; }
        completed = true;
        const u = new Utterance(phrase);
        u.lang = targetLang; u.voice = voice; u.rate = 0.88; u.pitch = 1;
        u.onerror = () => remoteSpeak();
        synth.speak(u);
        if (typeof synth.resume === "function") synth.resume();
      };
      if (synth.getVoices && synth.getVoices().length) startSpeaking();
      else {
        let started = false;
        const startOnce = () => { if (started) return; started = true; startSpeaking(); };
        if (synth.addEventListener) synth.addEventListener("voiceschanged", startOnce, { once: true });
        else if (synth.onvoiceschanged !== undefined) {
          const oldHandler = synth.onvoiceschanged;
          synth.onvoiceschanged = () => { try { if (typeof oldHandler === "function") oldHandler.call(synth); } finally { startOnce(); } };
        }
        setTimeout(startOnce, 900);
      }
    } catch { remoteSpeak(); }
  }
  async function translate() {
    const input=$("vocab-input"), from=$("vocab-from"), to=$("vocab-to"), btn=$("vocab-translate"); if(!input||!from||!to||!btn) return;
    const q=input.value.trim(); clearError(); if(!q){showError("Bạn hãy nhập từ hoặc câu cần dịch trước nhé.");input.focus();return;} if(from.value===to.value){showError("Hãy chọn hai ngôn ngữ khác nhau.");return;} if(busy)return;
    busy=true;btn.disabled=true;btn.textContent="Đang dịch…";
    try {
      const url="https://api.mymemory.translated.net/get?q="+encodeURIComponent(q)+"&langpair="+encodeURIComponent(from.value+"|"+to.value);
      const res=await fetch(url,{method:"GET",headers:{Accept:"application/json"}}); if(!res.ok) throw new Error("Dịch vụ đang bận."); const data=await res.json(); const translated=data?.responseData?.translatedText;
      if(!translated || data.responseStatus && Number(data.responseStatus)!==200) throw new Error("Chưa tìm được bản dịch phù hợp. Hãy thử lại sau.");
      lastTranslation=translated; const out=$("vocab-result"); if(out)out.textContent=translated; const wrap=$("vocab-result-wrap"); if(wrap)wrap.classList.remove("hidden"); const status=$("vocab-status"); if(status)status.textContent=langNames[from.value]+" → "+langNames[to.value];
    } catch(err) { showError("Không thể dịch lúc này. Hãy kiểm tra kết nối Internet rồi thử lại."); }
    finally {busy=false;btn.disabled=false;btn.textContent="🔎 Dịch ngay";}
  }
  document.addEventListener("click", (ev) => {
    const t=ev.target.closest("#vocab-translate, #vocab-swap, #vocab-clear, #vocab-speak-result"); if(!t)return;
    if(t.id==="vocab-translate"){translate();return;}
    if(t.id==="vocab-swap"){const a=$("vocab-from"),b=$("vocab-to");if(a&&b){const v=a.value;a.value=b.value;b.value=v;const input=$("vocab-input"),out=$("vocab-result");if(input&&out&&out.textContent.trim()){input.value=out.textContent;lastTranslation=out.textContent;$("vocab-result-wrap")?.classList.add("hidden");}}clearError();return;}
    if(t.id==="vocab-clear"){const input=$("vocab-input"),out=$("vocab-result"),wrap=$("vocab-result-wrap");if(input)input.value="";if(out)out.textContent="";if(wrap)wrap.classList.add("hidden");lastTranslation="";clearError();return;}
    if(t.id==="vocab-speak-result"){const to=$("vocab-to");speak(lastTranslation,to?to.value:"en");}
  });
  document.addEventListener("click", (ev) => { const t=ev.target.closest("#vocab-speak-source"); if(t){const input=$("vocab-input"),from=$("vocab-from");speak(input?.value.trim(),from?.value||"vi");} });
  document.addEventListener("keydown", ev => { if(ev.target?.id==="vocab-input" && ev.key==="Enter" && (ev.ctrlKey||ev.metaKey)){ev.preventDefault();translate();} });
})();
