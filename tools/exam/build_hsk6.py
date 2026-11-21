#!/usr/bin/env python3
"""Dựng đề HSK 6 (Nghe theo audio gốc + Đọc 51–100) trực tiếp từ PDF đề và mp3 do người dùng cung cấp.
Dùng: python3 -I tools/exam/build_hsk6.py <thư mục PDF/mp3> H61332 H61333 ... [CODE:L = chỉ phần Nghe] -> src/js/features/exam-data-zh-hsk6-e.js
Chữ lấy từ lớp chữ của PDF, đáp án theo bảng đáp án gốc; thiếu câu hoặc thiếu đáp án thì dừng (không đoán). Câu viết 101 (tóm tắt) bỏ."""
import glob, json, os, re, subprocess, sys
import pdfplumber
SRC = sys.argv[1]; SPECS = sys.argv[2:]; CODES = [x.split(":")[0] for x in SPECS]; LISTEN_ONLY = {x.split(":")[0] for x in SPECS if x.endswith(":L")}
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUD = os.path.join(ROOT, "src/exam-media/audio"); os.makedirs(AUD, exist_ok=True)
FOOT = re.compile(r"^H\d{5}\s*-\s*\d+$")

def pdf_path(code, ext="pdf"):
    f = glob.glob(os.path.join(SRC, "*-" + code + "." + ext)) + glob.glob(os.path.join(SRC, code + "." + ext))
    return f[0] if f else None

def clean_lines(t):
    out = []
    for ln in t.split("\n"):
        if not ln.strip(): continue
        s = ln.rstrip()
        core = s.strip()
        if FOOT.match(core) or (len(core) <= 4 and re.match(r"^[A-Za-z.]+$", core)): continue
        out.append(s)
    return out

def listening(code):
    """Trang nghe có 2 cột: tách theo vị trí số câu ở cột phải."""
    pdf = pdfplumber.open(pdf_path(code)); texts = []
    started = False
    for page in pdf.pages:
        pt = page.extract_text() or ""
        if "一、听" in pt: started = True
        if "二、阅" in pt: break
        if not started: continue
        words = page.extract_words()
        xs = [w["x0"] for w in words if re.match(r"^\d{1,2}[．.]", w["text"]) and w["x0"] > 200]
        if xs:
            cut = min(xs) - 4
            for box in ((0, 0, cut, page.height), (cut, 0, page.width, page.height)):
                texts.append(page.crop(box).extract_text() or "")
        else:
            texts.append(pt)
    opts = {}; cur = None
    for ln in clean_lines("\n".join(texts)):
        s = re.sub(r"\s+", " ", ln).strip()
        m = re.match(r"^(\d{1,2})[．.]\s*A\s*(.*)$", s)
        if m:
            cur = int(m.group(1)); opts[cur] = {"A": m.group(2).strip()}; last = "A"; continue
        m = re.match(r"^([BCD])\s*(.*)$", s)
        if m and cur is not None and m.group(1) not in opts[cur] and len(opts[cur]) == "ABCD".index(m.group(1)):
            opts[cur][m.group(1)] = m.group(2).strip(); last = m.group(1); continue
        if cur is not None and cur in opts and s and not re.match(r"^第", s) and last:
            if not re.match(r"^[一二三]、|听|^HSK", s): opts[cur][last] += s
    res = {}
    for n in range(1, 51):
        o = opts.get(n)
        if not o or len(o) != 4 or any(not v for v in o.values()): raise SystemExit("%s: lỗi lựa chọn nghe %d: %s" % (code, n, o))
        res[n] = [o[k] for k in "ABCD"]
    return res


def gap_lines(code):
    """Dòng chữ các trang 61-70 (chọn từ): khoảng trống rộng giữa ký tự (kể cả ở đầu/cuối dòng) = chỗ trống; ghép thành chuỗi có >=3 dấu cách tại chỗ trống."""
    pdf = pdfplumber.open(pdf_path(code)); out = []; on = False; done = False
    for page in pdf.pages:
        page = page.filter(lambda o: o["object_type"] != "char" or o["size"] <= 16)
        pt = page.extract_text() or ""
        if "第 61-70" in pt: on = True
        if not on: continue
        info = []
        for ln in page.extract_text_lines(return_chars=True, keep_blank_chars=True):
            ch = [c for c in ln["chars"] if c["text"].strip()]
            if not ch: continue
            buf = ""; prev = None
            for c in ln["chars"]:
                if not c["text"].strip():
                    if buf and not buf.endswith(" "): buf += " "
                    continue
                if prev is not None and c["x0"] - prev["x1"] > 0.75 * c["size"]: buf = buf.rstrip() + "   "
                buf += c["text"]; prev = c
            kind = "opt" if re.match(r"^[A-D]\s", buf.strip()) else ("num" if re.match(r"^\d{2}[．.]", buf.strip()) else ("foot" if FOOT.match(buf.strip()) else "txt"))
            info.append(dict(buf=buf, x0=ch[0]["x0"], x1=ch[-1]["x1"], size=ch[0]["size"], kind=kind))
        body = [x for x in info if x["kind"] == "txt"]
        if body:
            xs = sorted(round(x["x0"]) for x in body); left = max(set(xs), key=xs.count)
        else: left = 0
        right = max([x["x1"] for x in info if x["kind"] in ("txt", "num")] or [0])
        for k, x in enumerate(info):
            if re.search(r"第 ?71-80|第三部分", x["buf"]): done = True
            if done: break
            b = x["buf"]
            if x["kind"] == "txt":
                if x["x0"] - left > 0.75 * x["size"]: b = "＿＿" + b
                nxt = info[k + 1]["kind"] if k + 1 < len(info) else "end"
                if nxt in ("txt", "num") and right - x["x1"] > 1.2 * x["size"] and not re.search(r"[。？！]$", b.strip()): b = b.rstrip() + "＿＿"
            out.append(("  " if x["kind"] == "opt" else "") + b)
        if done: break
    return out

def blank(s): return re.sub(r"\s{3,}", "＿＿", s)

def reading(code):
    t = subprocess.run(["pdftotext", "-layout", pdf_path(code), "-"], capture_output=True, text=True).stdout
    i = t.find("二、阅"); j = t.find("三、书", i); k = t.rfind("卷答案")
    if i < 0 or j < 0 or k < 0: raise SystemExit(code + ": không có phần Đọc hoặc bảng đáp án")
    keytxt = re.sub(r"[ \t]+", " ", t[k:])
    ans = {}
    for m in re.finditer(r"(?<!\d)(\d{1,3})[．.]\s*([A-E])", keytxt): ans.setdefault(int(m.group(1)), m.group(2))
    L = clean_lines(t[i:j])
    def at(pat, start=0):
        for x in range(start, len(L)):
            if re.search(pat, L[x]): return x
        raise SystemExit(code + ": không thấy " + pat)
    a51, a61, a71, a81 = at(r"第 ?51-60"), at(r"第 ?61-70"), at(r"第 ?71-80"), at(r"第 ?81-100")
    items = {}
    # 51-60: câu có lỗi
    cur = None; res = {}
    for s in L[a51 + 1:a61]:
        if re.match(r"^\s*第[一二三四]部分", s): continue
        m = re.match(r"^(\d{2})[．.]\s*A\s*(.*)$", s.strip())
        if m: cur = int(m.group(1)); res[cur] = {"A": m.group(2).strip()}; last = "A"; continue
        m = re.match(r"^([BCD])\s+(.*)$", s.strip())
        if m and cur and len(res[cur]) == "ABCD".index(m.group(1)):
            res[cur][m.group(1)] = m.group(2).strip(); last = m.group(1); continue
        if cur: res[cur][last] += s.strip()
    for n in range(51, 61):
        if n not in res or len(res[n]) != 4: raise SystemExit("%s: lỗi câu %d" % (code, n))
        items[n] = ("", "%d．chọn câu có lỗi" % n, ["%s" % res[n][c] for c in "ABCD"])
    # 61-70: chọn từ
    qs = {}; cur = None; pre = None
    for s in clean_lines("\n".join(gap_lines(code))):
        if re.match(r"^\s*第[一二三四]部分", s) or re.search(r"第 ?71-80", s): continue
        m = re.match(r"^\s*(\d{2})[．.](.*)$", s)
        optm = re.match(r"^\s*([A-D])\s+\S", s)
        if m and 61 <= int(m.group(1)) <= 70 and not optm:
            cur = int(m.group(1)); body = m.group(2)
            qs[cur] = {"text": ((pre or "") + body) if pre else body, "opts": {}}; pre = None; continue
        if optm and cur:
            for piece in re.split(r"\s{2,}(?=[A-D]\s)", s.strip()):
                mm = re.match(r"^([A-D])\s+(.*)$", piece.strip())
                if mm: qs[cur]["opts"][mm.group(1)] = " / ".join(mm.group(2).split())
            continue
        if cur and qs[cur]["opts"]: pre = s.strip(); continue
        if cur: qs[cur]["text"] += s.strip()
    for n in range(61, 71):
        q = qs.get(n)
        if not q or len(q["opts"]) != 4: raise SystemExit("%s: lỗi câu chọn từ %d: %s" % (code, n, q))
        items[n] = ("", "%d．%s" % (n, blank(q["text"])), [q["opts"][c] for c in "ABCD"])
    # 71-80: chọn câu
    blk = L[a71 + 1:a81]
    heads = [x for x, s in enumerate(blk) if re.match(r"^\d{2}-\d{2,3}[．.]", s.strip())]
    if len(heads) != 2: raise SystemExit(code + ": đoạn 71-80 lỗi")
    for hi, h in enumerate(heads):
        end = heads[hi + 1] if hi + 1 < len(heads) else len(blk)
        seg = blk[h + 1:end]; ptxt = ""; ops = {}
        for s in seg:
            m = re.match(r"^\s*([A-E])\s+(\S.*)$", s)
            if m and len(ops) == "ABCDE".index(m.group(1)): ops[m.group(1)] = m.group(2).strip()
            else: ptxt += s.strip()
        ptxt = re.sub(r"\s{2,}", "", ptxt); ptxt = re.sub(r"（(\d+)）\s*", r"（\1）", ptxt)
        lo = int(re.match(r"^(\d{2})", blk[h].strip()).group(1))
        if len(ops) != 5: raise SystemExit("%s: lựa chọn %d-%d lỗi" % (code, lo, lo + 4))
        for n in range(lo, lo + 5):
            items[n] = (ptxt if n == lo else "^", "%d．chọn câu điền vào chỗ （%d）" % (n, n), [ops[c] for c in "ABCDE"])
    # 81-100: đọc hiểu
    blk = [x for y in L[a81 + 1:] for x in re.split(r"\s*(?=(?<!\d)\d{2}-\d{2,3}[．.])", y) if x.strip()]
    cur = None; passages = {}; qlist = {}; qn = None; last = None
    for s in blk:
        st = s.strip()
        if re.match(r"^第[一二三四]部分", st): continue
        m = re.match(r"^(\d{2})-(\d{2,3})[．.]\s*(.*)$", st)
        if m:
            cur = int(m.group(1)); passages[cur] = m.group(3); qn = None; continue
        m = re.match(r"^(\d{2,3})[．.]\s*(.*)$", st)
        if m and 81 <= int(m.group(1)) <= 100 and re.match(r"^\s+\d", s):
            qn = int(m.group(1)); qlist[qn] = {"q": m.group(2), "opts": {}, "p": cur}; last = "q"; continue
        if qn and re.match(r"^[A-D]\s", st):
            nxt = "ABCD"[len(qlist[qn]["opts"])]; pieces = []
            for piece in re.split(r"\s+(?=[A-D]\s)", st):
                if pieces and piece[0] != nxt: pieces[-1] += " " + piece; continue
                pieces.append(piece); nxt = "ABCD"[min(3, "ABCD".index(piece[0]) + 1)] if piece[0] in "ABCD" else nxt
            for piece in pieces:
                mm = re.match(r"^([A-D])\s+(.*)$", piece.strip())
                if mm: qlist[qn]["opts"][mm.group(1)] = mm.group(2).strip(); last = mm.group(1)
            continue
        if qn:
            if last == "q": qlist[qn]["q"] += st
            else: qlist[qn]["opts"][last] += st
        elif cur is not None: passages[cur] += st
    first = {}
    for n in range(81, 101):
        q = qlist.get(n)
        if not q or len(q["opts"]) != 4: raise SystemExit("%s: lỗi câu đọc hiểu %d: %s" % (code, n, q))
        p = q["p"]
        items[n] = (passages[p] if p not in first else "^", "%d．%s" % (n, q["q"]), [q["opts"][c] for c in "ABCD"])
        first[p] = 1
    miss = [n for n in range(1, 101) if n not in ans]
    if miss: raise SystemExit("%s: thiếu đáp án %s" % (code, miss))
    return items, ans

S = {"l1": "Nghe phần 1 (1–15): chọn câu đúng với nội dung", "l2": "Nghe phần 2 (16–30): chọn đáp án đúng", "l3": "Nghe phần 3 (31–50): chọn đáp án đúng",
     "r1": "Đọc phần 1 (51–60): chọn câu có lỗi", "r2": "Đọc phần 2 (61–70): chọn từ điền chỗ trống", "r3": "Đọc phần 3 (71–80): chọn câu điền chỗ trống", "r4": "Đọc phần 4 (81–100): đọc hiểu"}
J = lambda x: json.dumps(x, ensure_ascii=False)
out = ["  /* HSK 6 – sinh bằng tools/exam/build_hsk6.py từ PDF đề và audio gốc: Nghe (audio thật) + Đọc 51–100. Câu viết 101 (tóm tắt) bỏ. */\n  (function () {\n    var R = ZH.R, LA = ZH.LA;\n"]
for c in CODES:
    lo = listening(c); items, ans = reading(c)
    mp3 = pdf_path(c, "mp3"); audio = ""
    if mp3:
        dst = os.path.join(AUD, c + ".mp3")
        if not os.path.exists(dst): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", "16000", "-b:a", "24k", dst], check=True)
        audio = "exam-media/audio/%s.mp3" % c
    it = []
    if audio:
        for n in range(1, 51):
            sec = S["l1"] if n <= 15 else (S["l2"] if n <= 30 else S["l3"])
            it.append("LA(%s, %d, %s, %s, %s)" % (J(sec), n, J("%d．nghe audio rồi chọn đáp án" % n), J(lo[n]), J(ans[n])))
    if c not in LISTEN_ONLY:
        for n in range(51, 101):
            sec = S["r1"] if n <= 60 else S["r2"] if n <= 70 else S["r3"] if n <= 80 else S["r4"]
            p, q, o = items[n]
            it.append("R(%s, %d, %s, %s, %s, %s)" % (J(sec), n, J(p), J(q), J(o), J(ans[n])))
    out.append("    ZH.add(\"HSK 6\", %s, [\n      %s\n    ], \"Nguồn: thư mục ĐỀ THI TIẾNG TRUNG trên Google Drive.\"%s);\n" % (J(c), ",\n      ".join(it), (", " + J(audio)) if audio else ""))
out.append("  })();\n")
open(os.environ.get("OUT") or os.path.join(ROOT, "src/js/features/exam-data-zh-hsk6-e.js"), "w").write("".join(out))
print("OK", CODES)
