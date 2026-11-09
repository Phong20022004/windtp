
(() => {
  const COIN = "WIND Coin";
  const makeCoin = () => {
    const mark = document.createElement("span"); mark.className = "wind-coin-mark";
    mark.setAttribute("role", "img"); mark.setAttribute("aria-label", COIN);
    const w = document.createElement("span"); w.className = "wind-coin-mark__w"; w.textContent = "W"; mark.appendChild(w); return mark;
  };
  const TOK = /🪙|🎰|WIND Coin|(?<![\p{L}\p{N}_])chips?(?![\p{L}\p{N}_])/giu;
  const CHW = /(?<![\p{L}\p{N}_])chips?(?![\p{L}\p{N}_])/iu;
  const SKIP_TAG = /^(SCRIPT|STYLE|TEXTAREA|OPTION|TITLE|NOSCRIPT|INPUT)$/;
  const isMark = (n) => n && n.nodeType === 1 && n.classList && (n.classList.contains("wind-coin-mark") || n.classList.contains("chip-mark"));
  const makeChip = () => { const i = document.createElement("i"); i.className = "chip-mark"; i.setAttribute("role", "img"); i.setAttribute("aria-label", "Chip"); return i; };
  const patchText = (node) => {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const par = node.parentElement;
    if (!par || SKIP_TAG.test(par.tagName) || par.closest(".wind-coin-mark,.chip-mark")) return;
    const original = node.nodeValue || "";
    const value = original.replace(/Ví\s+Biểu Tượng Xu/g, COIN).replace(/Ví\s+Xu/g, COIN).replace(/Biểu Tượng Xu/g, COIN)
      .replace(/(?<![\p{L}\p{N}_])Xu(?![\p{L}\p{N}_])/gu, COIN);
    if (value !== original) node.nodeValue = value;
    if (!/🪙|🎰|WIND Coin|chip/i.test(value)) return;
    const walletNav = !!par.closest('button[data-action="goto"][data-tab="wallet"]');
    const hasChip = CHW.test(value);
    let prev = isMark(node.previousSibling), last = 0, changed = false, m;
    const frag = document.createDocumentFragment(); TOK.lastIndex = 0;
    while ((m = TOK.exec(value))) {
      const t = m[0], before = value.slice(last, m.index);
      if (before) { frag.appendChild(document.createTextNode(before)); if (before.trim()) prev = false; }
      if (t === "🪙") { frag.appendChild(makeCoin()); prev = true; changed = true; }
      else if (t === "🎰") { if (hasChip) { frag.appendChild(makeChip()); prev = true; changed = true; } else { frag.appendChild(document.createTextNode(t)); prev = false; } }
      else { const isCoin = t === "WIND Coin"; if (!prev && !(isCoin && walletNav)) { frag.appendChild(isCoin ? makeCoin() : makeChip()); changed = true; } frag.appendChild(document.createTextNode(t)); prev = false; }
      last = m.index + t.length;
    }
    if (!changed) return;
    const rest = value.slice(last); if (rest) frag.appendChild(document.createTextNode(rest));
    node.parentNode?.replaceChild(frag, node);
  };
  const patchTree = (root) => {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { patchText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE && root.closest?.(".wind-coin-mark")) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode); nodes.forEach(patchText);
  };
  const init = () => {
    const wallet = document.querySelector('button[data-action="goto"][data-tab="wallet"]');
    if (wallet) { wallet.setAttribute("aria-label", "Mở ví WIND Coin"); const label = wallet.querySelector("p"); if (label) label.textContent = "WIND Coin"; }
    patchTree(document.body);
    const observer = new MutationObserver((records) => records.forEach((r) => {
      if (r.type === "characterData") patchText(r.target);
      r.addedNodes?.forEach((n) => patchTree(n));
    }));
    observer.observe(document.body, { subtree:true, childList:true, characterData:true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true }); else init();
})();
