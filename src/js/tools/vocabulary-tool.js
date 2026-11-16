
(() => {
  const $ = (id) => document.getElementById(id);
  const langNames = {vi:"Tiếng Việt",en:"Tiếng Anh",ko:"Tiếng Hàn",ja:"Tiếng Nhật","zh-CN":"Tiếng Trung",fr:"Tiếng Pháp",de:"Tiếng Đức",es:"Tiếng Tây Ban Nha"};
  const speechLang = {vi:"vi-VN",en:"en-US",ko:"ko-KR",ja:"ja-JP","zh-CN":"zh-CN",fr:"fr-FR",de:"de-DE",es:"es-ES"};
  let lastTranslation = ""; let busy = false;
  function showError(message) { const e=$("vocab-error"); if(e){e.textContent=message;e.classList.remove("hidden");} }
  function clearError(){const e=$("vocab-error");if(e){e.textContent="";e.classList.add("hidden");}}
  function showNote(message) { const e=$("vocab-note"); if(e){e.textContent=message;e.classList.remove("hidden");} }
  function clearNote(){const e=$("vocab-note");if(e){e.textContent="";e.classList.add("hidden");}}
  function speak(text, lang, slow) {
    const phrase = String(text || "").trim();
    clearError(); clearNote();
    if (!phrase) { showError("Bạn hãy nhập từ/câu hoặc dịch trước khi bấm nghe."); return; }
    if (!window.WindtpSpeech) { showError("Không thể phát âm thanh trong trình duyệt này."); return; }
    window.WindtpSpeech.speak(phrase, speechLang[lang] || lang || "vi-VN", { slow: !!slow, onNote: showNote, onError: showError });
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
    const t=ev.target.closest("#vocab-translate, #vocab-swap, #vocab-clear, #vocab-speak-result, #vocab-speak-result-slow"); if(!t)return;
    if(t.id==="vocab-translate"){translate();return;}
    if(t.id==="vocab-swap"){const a=$("vocab-from"),b=$("vocab-to");if(a&&b){const v=a.value;a.value=b.value;b.value=v;const input=$("vocab-input"),out=$("vocab-result");if(input&&out&&out.textContent.trim()){input.value=out.textContent;lastTranslation=out.textContent;$("vocab-result-wrap")?.classList.add("hidden");}}clearError();clearNote();if($("vocab-input")?.value.trim())translate();return;}
    if(t.id==="vocab-clear"){const input=$("vocab-input"),out=$("vocab-result"),wrap=$("vocab-result-wrap");if(input)input.value="";if(out)out.textContent="";if(wrap)wrap.classList.add("hidden");lastTranslation="";clearError();clearNote();return;}
    if(t.id==="vocab-speak-result"||t.id==="vocab-speak-result-slow"){const to=$("vocab-to");speak(lastTranslation,to?to.value:"en",t.id==="vocab-speak-result-slow");}
  });
  document.addEventListener("click", (ev) => { const t=ev.target.closest("#vocab-speak-source, #vocab-speak-source-slow"); if(t){const input=$("vocab-input"),from=$("vocab-from");speak(input?.value.trim(),from?.value||"vi",t.id==="vocab-speak-source-slow");} });
  document.addEventListener("keydown", ev => { if(ev.target?.id==="vocab-input" && ev.key==="Enter" && (ev.ctrlKey||ev.metaKey)){ev.preventDefault();translate();} });
})();
