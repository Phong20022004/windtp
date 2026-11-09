
(function(){var RM=matchMedia("(prefers-reduced-motion:reduce)").matches;if(RM)return;
document.addEventListener("pointerdown",function(e){var t=e.target.closest&&e.target.closest('#tab-learn [data-action],#tab-community button[data-action]');if(!t)return;var r=t.getBoundingClientRect(),s=Math.max(r.width,r.height)*2,d=document.createElement("i");d.className="v47-rip";d.style.cssText="width:"+s+"px;height:"+s+"px;left:"+(e.clientX-r.left-s/2)+"px;top:"+(e.clientY-r.top-s/2)+"px";if(getComputedStyle(t).position==="static")t.style.position="relative";t.style.overflow=t.style.overflow||"hidden";t.appendChild(d);setTimeout(function(){d.remove()},650)},true);
/* nghiêng bìa sách theo con trỏ */
document.addEventListener("pointermove",function(e){if(e.pointerType==="touch")return;var c=e.target.closest&&e.target.closest('#tab-learn [data-action="lib-free"],#tab-learn [data-action="lib-premium"]');if(!c)return;var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform="perspective(600px) translateY(-6px) rotateX("+(-y*10).toFixed(1)+"deg) rotateY("+(x*12).toFixed(1)+"deg) scale(1.03)"},true);
document.addEventListener("pointerout",function(e){var c=e.target.closest&&e.target.closest('#tab-learn [data-action="lib-free"],#tab-learn [data-action="lib-premium"]');if(c)c.style.transform=""},true);
})();
