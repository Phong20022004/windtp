#!/usr/bin/env python3
"""Dựng đề HSK 4 (Nghe theo audio gốc + Đọc + Viết câu chữ) trực tiếp từ PDF đề và mp3 do người dùng cung cấp.
Dùng: python3 -I tools/exam/build_hsk4.py <thư mục PDF/mp3> H41002 H41004 ... -> src/js/features/exam-data-zh-hsk4-f.js
Chữ lấy từ lớp chữ của PDF, đáp án theo bảng đáp án gốc; thiếu bảng đáp án hoặc thiếu câu thì dừng (không đoán)."""
import glob, json, os, re, subprocess, sys
SRC = sys.argv[1]; SPECS = sys.argv[2:]; CODES = [x.split(":")[0] for x in SPECS]; LISTEN_ONLY = {x.split(":")[0] for x in SPECS if x.endswith(":L")}
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUD = os.path.join(ROOT, "src/exam-media/audio"); os.makedirs(AUD, exist_ok=True)
NOISE = re.compile(r"^(第[一二三]部分|三、书 ?写|tie|ng|tru|ne|t\.c|om|gtrungnet\.com|tiengtrungnet\.com|编制|H\d{5}\s*-\s*\d+|m|o|c|\.|t|e|n|g|u|r|i)$")

def lines_of(t):
    out = []
    for ln in t.split("\n"):
        s = re.sub(r"\s+", " ", ln).strip()
        if not s or NOISE.match(s): continue
        out.append(s)
    return out

def pdf_text(code):
    f = glob.glob(os.path.join(SRC, "*-" + code + ".pdf")) + glob.glob(os.path.join(SRC, code + ".pdf"))
    return subprocess.run(["pdftotext", "-layout", f[0], "-"], capture_output=True, text=True).stdout

def blank(s): return re.sub(r"（\s*）", "（　）", s)

def split_opts(s):
    m = re.match(r"^A\s*(.+?)\s+B\s*(.+?)\s+C\s*(.+?)\s+D\s*(.+)$", s)
    return [m.group(k).strip() for k in range(1, 5)] if m else None

def parse(code):
    t = pdf_text(code)
    i = t.find("二、阅"); k = t.rfind("卷答案")
    if i < 0 or k < 0: raise SystemExit(code + ": không có phần Đọc hoặc bảng đáp án")
    head, body, keytxt = t[:i], t[i:k], t[k:]
    # --- đáp án
    ans = {}
    for m in re.finditer(r"(?<!\d)(\d{1,2})[．.]\s*([A-F]{3}|[A-F]|[√×])", re.sub(r"[ \t]+", " ", keytxt)):
        n = int(m.group(1)); ans.setdefault(n, m.group(2))
    wr = {}
    for m in re.finditer(r"(?<!\d)(8[6-9]|9[0-5])[．.]\s*([^\n]+?)(?=\s+(?:8[6-9]|9[0-5])[．.]|\n|$)", re.sub(r"[ \t]+", " ", keytxt)):
        wr.setdefault(int(m.group(1)), m.group(2).strip())
    # --- nghe
    seg = re.sub(r"[ \t]+", " ", head)
    opts, stm = {}, {}
    for m in re.finditer(r"(?<!\d)(\d{2})[．.]\s*A\s*([^\n]*?)\s+B\s*([^\n]*?)\s+C\s*([^\n]*?)\s+D\s*([^\n]*)", seg):
        n = int(m.group(1))
        if 11 <= n <= 45: opts.setdefault(n, [m.group(j).strip() for j in range(2, 6)])
    for m in re.finditer(r"(?<!\d)(\d{1,2})[．.]\s*★\s*([^（(\n]+)", seg):
        n = int(m.group(1))
        if 1 <= n <= 10: stm.setdefault(n, m.group(2).strip())
    # --- đọc / viết
    L = lines_of(body)
    def idx(pat):
        for j, s in enumerate(L):
            if re.search(pat, s): return j
        raise SystemExit(code + ": không thấy " + pat)
    a46, a51, a56, a66, a86 = idx(r"第 ?46-50 ?题"), idx(r"第 ?51-55 ?题"), idx(r"第 ?56-65 ?题"), idx(r"第 ?66-85 ?题"), idx(r"第 ?86-95 ?题")
    try: a96 = idx(r"第 ?96-100 ?题")
    except SystemExit: a96 = len(L)
    def numbered(block, pat=r"^(\d{1,2})[．.]"):
        cur = None; res = {}
        for s in block:
            m = re.match(pat, s)
            if m: cur = int(m.group(1)); res[cur] = [s[m.end():].strip()]
            elif cur is not None: res[cur].append(s)
        return res
    reading = {}
    for lo, hi, a, b in ((46, 50, a46, a51), (51, 55, a51, a56)):
        blk = L[a + 1:b]
        bank_line = [s for s in blk if re.match(r"^A \S+ B \S+", s)][0]
        bank = re.findall(r"[A-F] (\S+)", bank_line)
        if len(bank) != 6: raise SystemExit(code + ": ngân hàng từ lỗi " + bank_line)
        qs = numbered([s for s in blk if s != bank_line and not s.startswith("例如") and not re.match(r"^B：刚才", s)])
        for n in range(lo, hi + 1):
            parts = qs[n]
            txt = parts[0]
            for p in parts[1:]:
                txt += ("\n" + p) if re.match(r"^[AB]：", p) else p
            reading[n] = ("bank", bank, blank(txt.replace("．", "．", 1)))
    order = {}
    for n, parts in numbered(L[a56 + 1:a66]).items():
        if 56 <= n <= 65:
            parts = [x for x in parts]
            joined = []
            for p in parts:
                if re.match(r"^[ABC] ", p): joined.append(p[2:].strip())
                elif joined: joined[-1] += p
                else:
                    m = re.match(r"^A (.+)$", p)
                    joined.append(m.group(1) if m else p)
            order[n] = joined
    for n in range(56, 66):
        if len(order.get(n, [])) != 3: raise SystemExit("%s: câu sắp xếp %d lỗi %s" % (code, n, order.get(n)))
    # đọc hiểu 66-85
    blk = L[a66 + 1:a86]
    blk = [s for s in blk if not s.startswith("例如") and not re.match(r"^起。|^★ 她是个什么样|^A 幽默", s)]
    passages = {}; cur = None; qn = None
    qs3 = {}
    i = 0
    while i < len(blk):
        s = blk[i]
        m = re.match(r"^(\d{2})-(\d{2})[．.]\s*(.*)$", s)
        m2 = re.match(r"^(\d{2})[．.]\s*(.*)$", s)
        if m:
            a_, b_ = int(m.group(1)), int(m.group(2)); cur = ("pair", a_, b_, m.group(3)); passages[a_] = cur; qs3[a_] = []; qs3[b_] = qs3[a_]; qn = a_
            i += 1; continue
        if m2 and 66 <= int(m2.group(1)) <= 79:
            n = int(m2.group(1)); cur = ("one", n, n, m2.group(2)); passages[n] = cur; qs3[n] = []; qn = n; i += 1; continue
        if s.startswith("★"):
            qs3_key = qn
            q = s
            i += 1
            while i < len(blk) and not re.match(r"^A ", blk[i]): q += blk[i]; i += 1
            o = split_opts(blk[i]) if i < len(blk) else None
            if not o: raise SystemExit("%s: lỗi lựa chọn sau %s" % (code, q))
            # tìm cuộc trò chuyện
            qs3[qs3_key].append((q, o)); i += 1; continue
        # dòng thuộc đoạn văn
        cur_list = list(cur); cur_list[3] += s; cur = tuple(cur_list); passages[cur[1]] = cur
        i += 1
    # đánh số câu
    final = {}
    for a_, (kind, a2, b2, text) in passages.items():
        ql = qs3[a_]
        if kind == "one":
            if len(ql) != 1: raise SystemExit("%s: câu %d có %d câu hỏi" % (code, a_, len(ql)))
            final[a_] = (text, ql[0][0], ql[0][1], False)
        else:
            if len(ql) != 2: raise SystemExit("%s: cặp %d-%d có %d câu hỏi" % (code, a_, b2, len(ql)))
            final[a_] = (text, ql[0][0], ql[0][1], False); final[b2] = ("^", ql[1][0], ql[1][1], True)
    for n in range(66, 86):
        if n not in final: raise SystemExit("%s: thiếu câu đọc hiểu %d" % (code, n))
    # viết 86-95
    wnums = numbered(L[a86 + 1:a96])
    words = {}
    for n in range(86, 96):
        if n not in wnums: raise SystemExit("%s: thiếu câu viết %d" % (code, n))
        words[n] = " / ".join(x for x in re.sub(r"(\d) (?=(?:公里|分钟|年|月|号|岁|元|块))", r"\1", " ".join(wnums[n])).split(" ") if x)
    miss = [n for n in list(range(1, 46)) + list(range(46, 86)) if n not in ans] + [n for n in range(86, 96) if n not in wr]
    miss += [n for n in range(1, 11) if n not in stm] + [n for n in range(11, 46) if n not in opts]
    if miss: raise SystemExit(code + ": thiếu " + str(sorted(set(miss))))
    return dict(stm=stm, opts=opts, ans=ans, reading=reading, order=order, final=final, words=words, wr=wr)

S = {"l1": "Nghe phần 1 (1–10): đúng / sai", "l2": "Nghe phần 2 (11–25): hội thoại ngắn", "l3": "Nghe phần 3 (26–45): hội thoại và đoạn dài",
     "r1": "Đọc phần 1 (46–55): chọn từ điền chỗ trống", "r2": "Đọc phần 2 (56–65): sắp xếp thứ tự", "r3": "Đọc phần 3 (66–85): đọc hiểu"}
J = lambda x: json.dumps(x, ensure_ascii=False)
out = ["  /* HSK 4 – sinh bằng tools/exam/build_hsk4.py từ PDF đề và audio gốc: Nghe (audio thật), Đọc, Viết (câu chữ). */\n  (function () {\n    var R = ZH.R, O = ZH.O, W0 = ZH.W, LA = ZH.LA, TF = [\"对 √\", \"错 ×\"];\n    var W = function (n, w, a) { var x = W0(n, w, a[0]); for (var i = 1; i < a.length; i++) x.text.push(a[i]); return x; };\n"]
for c in CODES:
    d = parse(c)
    mp3s = glob.glob(os.path.join(SRC, "*-" + c + ".mp3")) + glob.glob(os.path.join(SRC, c + ".mp3"))
    audio = ""
    if mp3s:
        dst = os.path.join(AUD, c + ".mp3")
        if not os.path.exists(dst): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3s[0], "-ac", "1", "-ar", "16000", "-b:a", "24k", dst], check=True)
        audio = "exam-media/audio/%s.mp3" % c
    it = []
    if audio:
        for n in range(1, 11): it.append("LA(%s, %d, %s, TF, %s)" % (J(S["l1"]), n, J("%d．★ %s" % (n, d["stm"][n])), J("A" if d["ans"][n] == "√" else "B")))
        for n in range(11, 46): it.append("LA(%s, %d, %s, %s, %s)" % (J(S["l2"] if n <= 25 else S["l3"]), n, J("%d．nghe audio rồi chọn đáp án" % n), J(d["opts"][n]), J(d["ans"][n])))
    for n in ([] if c in LISTEN_ONLY else range(46, 56)):
        _, bank, txt = d["reading"][n]
        it.append("R(%s, %d, \"\", %s, %s, %s)" % (J(S["r1"]), n, J("%d．%s" % (n, txt)), J(bank), J(d["ans"][n])))
    for n in ([] if c in LISTEN_ONLY else range(56, 66)): it.append("O(%s, %d, %s, %s)" % (J(S["r2"]), n, J(d["order"][n]), J(d["ans"][n])))
    for n in ([] if c in LISTEN_ONLY else range(66, 86)):
        text, q, o, _ = d["final"][n]
        it.append("R(%s, %d, %s, %s, %s, %s)" % (J(S["r3"]), n, J(text), J("%d．%s" % (n, q)), J(o), J(d["ans"][n])))
    for n in ([] if c in LISTEN_ONLY else range(86, 96)):
        ans = [x.strip() for x in d["wr"][n].split("/") if x.strip()]
        it.append("W(%d, %s, %s)" % (n, J(d["words"][n]), J(ans)))
    out.append("    ZH.add(\"HSK 4\", %s, [\n      %s\n    ], \"Nguồn: thư mục ĐỀ THI TIẾNG TRUNG trên Google Drive.\"%s);\n" % (J(c), ",\n      ".join(it), (", " + J(audio)) if audio else ""))
out.append("  })();\n")
open(os.environ.get("OUT") or os.path.join(ROOT, "src/js/features/exam-data-zh-hsk4-f.js"), "w").write("".join(out))
print("OK", CODES)
