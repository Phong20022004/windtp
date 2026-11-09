
(function(){var last=0;document.addEventListener("click",function(e){var w=e.target.closest&&e.target.closest("#banner-wrap");if(!w)return;var n=Date.now();if(n-last<420){last=0;e.preventDefault();e.stopPropagation();document.dispatchEvent(new CustomEvent("windtp-fashion"));}else last=n;},true);})();
