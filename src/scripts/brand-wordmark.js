(() => {
  // Thay mọi chữ "WINDTP" hiển thị trong app bằng logo chữ WINDTP (cùng kiểu với màn đăng nhập).
  // Không đụng vào: màn đăng nhập (đã có logo gốc), ô nhập, script/style, tiêu đề, thẻ SVG và chính logo.
  const MARK = /(?<![\p{L}\p{N}_@/.-])WINDTP(?![\p{L}\p{N}_@/]|\.[\p{L}\p{N}])/gu;
  const SKIP_TAG = /^(SCRIPT|STYLE|TEXTAREA|OPTION|TITLE|NOSCRIPT|INPUT|SELECT|CODE|PRE)$/;
  const SKIP_CLOSEST = "#login-gate,.wd-wm,.lg-word,#brand-text,svg,[contenteditable='true']";

  const onDark = (el) => {
    // Chữ cha gần như trắng => đang nằm trên nền màu/đậm.
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(getComputedStyle(el).color || "");
    if (!m) return false;
    const a = m[4] === undefined ? 1 : Number(m[4]);
    return a > 0.5 && Number(m[1]) > 200 && Number(m[2]) > 200 && Number(m[3]) > 200;
  };

  const makeMark = (dark) => {
    const wm = document.createElement("span");
    wm.className = dark ? "wd-wm wd-wm--on-dark" : "wd-wm";
    wm.setAttribute("role", "img");
    wm.setAttribute("aria-label", "WINDTP");
    const b = document.createElement("b"); b.textContent = "WIND"; b.setAttribute("aria-hidden", "true");
    const i = document.createElement("i"); i.textContent = "TP"; i.setAttribute("aria-hidden", "true");
    wm.appendChild(b); wm.appendChild(i);
    return wm;
  };

  const patchText = (node) => {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const par = node.parentElement;
    if (!par || SKIP_TAG.test(par.tagName) || par.closest(SKIP_CLOSEST)) return;
    const value = node.nodeValue || "";
    if (value.indexOf("WINDTP") === -1) return;
    MARK.lastIndex = 0;
    if (!MARK.test(value)) return;
    MARK.lastIndex = 0;
    const dark = onDark(par);
    const frag = document.createDocumentFragment();
    let last = 0, m;
    while ((m = MARK.exec(value))) {
      if (m.index > last) frag.appendChild(document.createTextNode(value.slice(last, m.index)));
      frag.appendChild(makeMark(dark));
      last = m.index + m[0].length;
    }
    if (last < value.length) frag.appendChild(document.createTextNode(value.slice(last)));
    node.parentNode?.replaceChild(frag, node);
  };

  const patchTree = (root) => {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { patchText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE && root.closest?.(SKIP_CLOSEST)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(patchText);
  };

  const init = () => {
    patchTree(document.body);
    const observer = new MutationObserver((records) => records.forEach((r) => {
      if (r.type === "characterData") patchText(r.target);
      r.addedNodes?.forEach((n) => patchTree(n));
    }));
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
