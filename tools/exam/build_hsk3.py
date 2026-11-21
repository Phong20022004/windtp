#!/usr/bin/env python3
"""Dựng đề HSK 3 (Nghe theo audio gốc + Đọc + Viết) từ PDF đề và mp3 do người dùng cung cấp.
Dùng: python3 -I tools/exam/build_hsk3.py <thư mục PDF/mp3> H31333 ... -> src/js/features/exam-data-zh-hsk3-d.js
Câu 1–10 (xem hình) là ảnh cắt từ đề; còn lại lấy chữ từ lớp chữ của PDF, đáp án theo bảng đáp án gốc. Thiếu câu thì dừng (không đoán)."""
import glob, json, os, re, subprocess, sys
import pdfplumber, pypdfium2 as pdfium
SRC = sys.argv[1]; CODES = sys.argv[2:]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMG = os.path.join(ROOT, "src/exam-media/img"); AUD = os.path.join(ROOT, "src/exam-media/audio")
os.makedirs(IMG, exist_ok=True); os.makedirs(AUD, exist_ok=True)
NOISE = re.compile(r"^([a-z.]{1,4}|tru|tie|H\d{5}\s*-\s*\d+|-\d+-)$")
J = lambda x: json.dumps(x, ensure_ascii=False)
def find(code, ext):
    h = glob.glob(os.path.join(SRC, "*-" + code + "." + ext)) + glob.glob(os.path.join(SRC, code + "." + ext)); return h[0] if h else None
def lines(t): return [l.rstrip() for l in t.split("\n") if l.strip() and not NOISE.match(l.strip()) and not re.match(r"^\s*(第 ?[一二三四] ?部 ?分|[一二三] ?、.{1,6})\s*$", l)]
def blank(s): return re.sub(r"（\s*）", "（　）", s)
def crops(code):
    pdfp = find(code, "pdf"); pdf = pdfplumber.open(pdfp); doc = pdfium.PdfDocument(pdfp); out = {}
    for pi, pg in enumerate(pdf.pages[:4]):
        text = (pg.extract_text() or "").replace(" ", "")
        m = re.search(r"第(\d+)-(\d+)题", text)
        if not m or int(m.group(1)) not in (1, 6): continue
        lo = int(m.group(1)); hb = 60
        for w in pg.extract_words():
            if w["text"].startswith("第") and w["top"] > 60 and re.search(r"\d+[-–]\d+题", "".join(x["text"] for x in pg.extract_words() if abs(x["top"] - w["top"]) < 3)): hb = w["bottom"] + 6
        S = 1.6; im = doc[pi].render(scale=S).to_pil().convert("RGB")
        im.crop((int(40 * S), int(hb * S), int((pg.width - 40) * S), int(min(pg.height, 770) * S))).save(os.path.join(IMG, "%s-s%d.jpg" % (code, lo)), "JPEG", quality=72, optimize=True)
        for n in range(lo, lo + 5): out[n] = "exam-media/img/%s-s%d.jpg" % (code, lo)
    if len(out) != 10: raise SystemExit(code + ": không cắt được hình câu 1–10")
    return out
def parse(code):
    t = subprocess.run(["pdftotext", "-layout", find(code, "pdf"), "-"], capture_output=True, text=True).stdout
    k = t.rfind("卷答案"); e = t.find("卷听力材料"); e = e if e > 0 else k
    if k < 0: raise SystemExit(code + ": không có bảng đáp án")
    ktxt = re.sub(r"[a-z]", "", re.sub(r"[ \t]+", " ", t[k:]))
    ans = {}
    for m in re.finditer(r"(?<!\d)(\d{1,2})\s*[．.]\s*([A-F√×])", ktxt): ans.setdefault(int(m.group(1)), m.group(2))
    sent = {}
    for m in re.finditer(r"(?m)^\s*(7[1-5])[．.]\s*(\S.*)$", t[k:]): sent.setdefault(int(m.group(1)), m.group(2).strip())
    chars = {}
    for m in re.finditer(r"(?m)^\s*(7[6-9]|80)[．.]\s*(\S+)\s*$", t[k:]): chars.setdefault(int(m.group(1)), m.group(2))
    L = lines(t[:e])
    def at(pat, s=0):
        for i in range(s, len(L)):
            if re.search(pat, L[i]): return i
        raise SystemExit(code + ": không thấy " + pat)
    a11, a21, a31, a41, a46, a51, a56, a61, a71 = [at(p) for p in (r"第 ?11-20 ?题", r"第 ?21-30 ?题", r"第 ?31-40 ?题", r"第 ?41-45 ?题", r"第 ?46-50 ?题", r"第 ?51-55 ?题", r"第 ?56-60 ?题", r"第 ?61-70 ?题", r"第 ?71-75 ?题")]
    a76 = at(r"第 ?76-80 ?题")
    tf = {}
    for s in L[a11:a21]:
        m = re.match(r"^\s*(\d{2})[．.]\s*★\s*(.+?)\s*（", s)
        if m: tf[int(m.group(1))] = m.group(2)
    opts = {}
    for s in L[a21:a41]:
        m = re.match(r"^\s*(\d{2})[．.]\s*A\s+(.+?)\s{2,}B\s+(.+?)\s{2,}C\s+(.+?)\s*$", s)
        if m: opts[int(m.group(1))] = [m.group(i).strip() for i in (2, 3, 4)]
    rd = {}
    for lo, hi, a, b in ((41, 45, a41, a46), (46, 50, a46, a51)):
        bank = []; qs = {}
        for s in L[a + 1:b]:
            m = re.match(r"^\s*([A-F])\s+(\S.*)$", s)
            if m and not re.match(r"^\s*\d", s) and not s.strip().startswith("例如"): bank.append(m.group(2).strip()); continue
            m = re.match(r"^\s*(\d{2})[．.]\s*(.+?)\s*（\s*）\s*$", s)
            if m: qs[int(m.group(1))] = m.group(2)
        if len(bank) != 5 + (lo == 41) or any(n not in qs for n in range(lo, hi + 1)): raise SystemExit("%s: lỗi câu ghép %d-%d" % (code, lo, hi))
        for n in range(lo, hi + 1): rd[n] = ("", "%d．%s" % (n, qs[n]), bank)
    for lo, a, b in ((51, a51, a56), (56, a56, a61)):
        bank = None; qs = {}; cur = None
        for s in L[a + 1:b]:
            if bank is None:
                bank = [m.group(1) for m in re.finditer(r"[A-F]\s+(\S+)", s)]; continue
            if s.strip().startswith("例如") or re.match(r"^\s*[AB][：:]", s) and cur is None: 
                continue
            m = re.match(r"^\s*(\d{2})[．.]\s*(.*)$", s)
            if m: cur = int(m.group(1)); qs[cur] = m.group(2).strip(); continue
            if cur: qs[cur] += "\n" + s.strip()
        if len(bank) != 6 or any(n not in qs for n in range(lo, lo + 5)): raise SystemExit("%s: lỗi câu điền từ %d: %s %s" % (code, lo, bank, sorted(qs)))
        for n in range(lo, lo + 5): rd[n] = ("", "%d．%s" % (n, blank(qs[n])), bank)
    cur = None; ps = {}; 
    for s in L[a61 + 1:a71]:
        if s.strip().startswith("例如"): cur = None; continue
        m = re.match(r"^\s*(\d{2})[．.]\s*(.*)$", s)
        if m and 61 <= int(m.group(1)) <= 70: cur = int(m.group(1)); ps[cur] = {"p": m.group(2).strip(), "q": None, "o": None}; continue
        if cur is None: continue
        if s.strip().startswith("★"): ps[cur]["q"] = s.strip(); continue
        mo = re.match(r"^\s*A\s+(.+?)\s{2,}B\s+(.+?)\s{2,}C\s+(.+?)\s*$", s)
        if mo and ps[cur]["q"]: ps[cur]["o"] = [mo.group(i).strip() for i in (1, 2, 3)]; continue
        if ps[cur]["q"] is None: ps[cur]["p"] += s.strip()
        else: ps[cur]["q"] += s.strip()
    for n in range(61, 71):
        if n not in ps or not ps[n]["o"] or not ps[n]["q"]: raise SystemExit("%s: lỗi đọc hiểu %d: %s" % (code, n, ps.get(n)))
        rd[n] = (ps[n]["p"], "%d．%s" % (n, ps[n]["q"]), ps[n]["o"])
    words = {}
    for s in L[a71 + 1:a76]:
        m = re.match(r"^\s*(7[1-5])[．.]\s*(.+)$", s)
        if m: words[int(m.group(1))] = " / ".join(x for x in re.split(r"\s{2,}", m.group(2).strip()) if x)
    wq = {}
    for s in L[a76 + 1:]:
        m = re.match(r"^\s*(7[6-9]|80)[．.]\s*(.+)$", s)
        if m: wq[int(m.group(1))] = blank(m.group(2).strip())
    miss = [n for n in range(1, 71) if n not in ans] + [n for n in range(71, 76) if n not in sent or n not in words] + [n for n in range(76, 81) if n not in chars or n not in wq]
    miss += [n for n in range(11, 21) if n not in tf] + [n for n in range(21, 41) if n not in opts]
    if miss: raise SystemExit(code + ": thiếu " + str(sorted(set(miss))))
    return dict(ans=ans, sent=sent, chars=chars, tf=tf, opts=opts, rd=rd, words=words, wq=wq)
S = lambda n: ("Nghe phần 1 (1–5): xem hình" if n <= 5 else "Nghe phần 1 (6–10): xem hình" if n <= 10 else "Nghe phần 2 (11–20): đúng / sai" if n <= 20 else "Nghe phần 3 (21–30): chọn đáp án" if n <= 30 else "Nghe phần 4 (31–40): chọn đáp án" if n <= 40 else
               "Đọc phần 1 (41–50): ghép câu" if n <= 50 else "Đọc phần 2 (51–60): chọn từ điền chỗ trống" if n <= 60 else "Đọc phần 3 (61–70): đọc hiểu")
out = ["  /* HSK 3 – sinh bằng tools/exam/build_hsk3.py từ PDF đề và audio gốc: Nghe (audio thật; câu 1–10 là ảnh cắt từ đề), Đọc, Viết. */\n  (function () {\n    var R = ZH.R, LA = ZH.LA, W0 = ZH.W;\n    var LI = function (sec, n, q, img, o, a) { var x = LA(sec, n, q, o, a); x.img = img; return x; };\n    var W = function (n, w, a) { var x = W0(n, w, a); x.text.push(a.replace(/[。？！]$/, \"\")); return x; };\n    var F = function (n, q, a) { return { kind: \"writing\", n: n, sec: \"Viết phần 2 (76–80): điền chữ Hán\", q: q, text: [a] }; };\n"]
for c in CODES:
    d = parse(c); im = crops(c); mp3 = find(c, "mp3"); audio = ""
    if mp3:
        dst = os.path.join(AUD, c + ".mp3")
        if not os.path.exists(dst): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", "16000", "-b:a", "24k", dst], check=True)
        audio = "exam-media/audio/%s.mp3" % c
    it = []
    if audio:
        for n in range(1, 11): it.append("LI(%s, %d, %s, %s, %s, %s)" % (J(S(n)), n, J("Câu %d – nghe audio rồi chọn hình" % n), J(im[n]), J(["A", "B", "C", "D", "E", "F"] if n <= 5 else ["A", "B", "C", "D", "E"]), J(d["ans"][n])))
        for n in range(11, 21): it.append("LA(%s, %d, %s, [\"对 √\", \"错 ×\"], %s)" % (J(S(n)), n, J("%d．★ %s" % (n, d["tf"][n])), J("A" if d["ans"][n] == "√" else "B")))
        for n in range(21, 41): it.append("LA(%s, %d, %s, %s, %s)" % (J(S(n)), n, J("%d．nghe audio rồi chọn đáp án" % n), J(d["opts"][n]), J(d["ans"][n])))
    for n in range(41, 71):
        p, q, o = d["rd"][n]
        it.append("R(%s, %d, %s, %s, %s, %s)" % (J(S(n)), n, J(p), J(q), J(o), J(d["ans"][n])))
    for n in range(71, 76): it.append("W(%d, %s, %s)" % (n, J(d["words"][n]), J(d["sent"][n])))
    for n in range(76, 81): it.append("F(%d, %s, %s)" % (n, J("%d．%s" % (n, d["wq"][n])), J(d["chars"][n])))
    out.append("    ZH.add(\"HSK 3\", %s, [\n      %s\n    ], \"Nguồn: thư mục ĐỀ THI TIẾNG TRUNG trên Google Drive.\"%s);\n" % (J(c), ",\n      ".join(it), (", " + J(audio)) if audio else ""))
out.append("  })();\n")
open(os.environ.get("OUT") or os.path.join(ROOT, "src/js/features/exam-data-zh-hsk3-d.js"), "w").write("".join(out))
print("OK", CODES)
