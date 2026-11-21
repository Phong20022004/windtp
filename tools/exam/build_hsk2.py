#!/usr/bin/env python3
"""Dựng đề HSK 2 (dạng hình) từ PDF + mp3 người dùng cung cấp: mỗi câu/nhóm câu là ảnh cắt từ đề gốc.
Dùng: python3 -I tools/exam/build_hsk2.py <thư mục PDF/mp3>  -> src/exam-media/img, audio và src/js/features/exam-data-zh-hsk2-a.js
Đề có mp3 -> Nghe + Đọc; đề không có mp3 -> chỉ Đọc. Đáp án theo bảng đáp án ở trang cuối của PDF."""
import glob, json, os, re, subprocess, sys
import pdfplumber, pypdfium2 as pdfium
SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMG = os.path.join(ROOT, "src/exam-media/img"); AUD = os.path.join(ROOT, "src/exam-media/audio")
os.makedirs(IMG, exist_ok=True); os.makedirs(AUD, exist_ok=True)
SCALE = 1.6; FOOT = 770
def find(code, ext):
    h = glob.glob(os.path.join(SRC, "*-" + code + "." + ext)) + glob.glob(os.path.join(SRC, code + "." + ext)); return h[0] if h else None
def kind_of(n): return "listening" if n <= 35 else "reading"
def mode_of(n):
    if n <= 10: return "rows"
    if n <= 20: return "sec"
    if n <= 35: return "line"
    if n <= 45: return "sec"
    if n <= 50: return "blk"
    return "sec"
def sec_of(n):
    for lo, hi, t in ((1, 10, "Nghe phần 1 (1–10): hình đúng / sai"), (11, 15, "Nghe phần 2 (11–15): ghép hình"), (16, 20, "Nghe phần 2 (16–20): ghép hình"),
                      (21, 30, "Nghe phần 3 (21–30): chọn đáp án"), (31, 35, "Nghe phần 4 (31–35): chọn đáp án"), (36, 40, "Đọc phần 1 (36–40): ghép hình"),
                      (41, 45, "Đọc phần 2 (41–45): điền từ"), (46, 50, "Đọc phần 3 (46–50): đúng / sai"), (51, 55, "Đọc phần 4 (51–55): ghép câu"), (56, 60, "Đọc phần 4 (56–60): ghép câu")):
        if lo <= n <= hi: return t
def sec_range(n):
    return {1: (1, 10)}.get(1) if n <= 10 else ((11, 15) if n <= 15 else (16, 20) if n <= 20 else (36, 40) if n <= 40 else (41, 45) if n <= 45 else (51, 55) if n <= 55 else (56, 60))
def answers(pdf):
    key = re.sub(r"[a-z]", "", pdf.pages[-1].extract_text() or "")
    out = {}
    for n, a in re.findall(r"(\d{1,2})\s*[．.]\s*[a-z]?\s*([A-F√×])", key): out.setdefault(int(n), a)
    return out
def build(code):
    pdfp = find(code, "pdf"); mp3 = find(code, "mp3")
    pdf = pdfplumber.open(pdfp); doc = pdfium.PdfDocument(pdfp)
    ans = answers(pdf)
    if len(ans) != 60 or any(n not in ans for n in range(1, 61)): raise SystemExit("%s: bảng đáp án có %d câu" % (code, len(ans)))
    crops = {}
    for pi, pg in enumerate(pdf.pages):
        text = pg.extract_text() or ""
        if "答案" in text[:40] or "听力材料" in text.replace(" ", "")[:40]: break
        words = pg.extract_words()
        labels = []
        hdr_bottom = 60
        for w in words:
            if w["text"].startswith("第") and w["top"] > 60:
                line = "".join(x["text"] for x in words if abs(x["top"] - w["top"]) < 3)
                if re.search(r"\d+[-–]\d+题", line): hdr_bottom = max(hdr_bottom, w["bottom"] + 6)
        for w in words:
            mm = re.match(r"^(\d{1,2})[．.]", w["text"])
            if mm and w["x0"] < 125 and 1 <= int(mm.group(1)) <= 60 and w["top"] > hdr_bottom - 4:
                labels.append((int(mm.group(1)), (w["top"] + w["bottom"]) / 2, w["top"]))
        if not labels: continue
        labels.sort(key=lambda x: x[1])
        render = doc[pi].render(scale=SCALE).to_pil().convert("RGB")
        def crop(top, bottom, name):
            top = max(0, top); bottom = min(pg.height, bottom)
            render.crop((int(40 * SCALE), int(top * SCALE), int((pg.width - 40) * SCALE), int(bottom * SCALE))).save(os.path.join(IMG, name), "JPEG", quality=72, optimize=True)
            return "exam-media/img/" + name
        ys = sorted({round(e["top"]) for e in pg.horizontal_edges if e["x1"] - e["x0"] > 150})
        done = set()
        for k, (n, y, top) in enumerate(labels):
            m = mode_of(n)
            if m == "rows":
                above = [e for e in ys if e < y - 2]; below = [e for e in ys if e > y + 2]
                if not above or not below: raise SystemExit("%s trang %d: không thấy khung hàng câu %d" % (code, pi + 1, n))
                crops[n] = crop(above[-1] - 1, below[0] + 2, "%s-q%d.jpg" % (code, n))
            elif m == "sec":
                lo, hi = sec_range(n)
                if lo not in done:
                    f = crop(hdr_bottom, FOOT, "%s-s%d.jpg" % (code, lo)); done.add(lo)
                    for j in range(lo, hi + 1): crops[j] = f
            else:
                t = y - 17
                nxt = labels[k + 1][1] - 17 if k + 1 < len(labels) else FOOT
                b = (y + 9) if m == "line" else nxt
                crops[n] = crop(t, b, "%s-q%d.jpg" % (code, n))
    miss = [n for n in range(1, 61) if n not in crops]
    if miss: raise SystemExit(code + ": thiếu hình câu " + str(miss))
    audio = ""
    if mp3:
        out = os.path.join(AUD, code + ".mp3")
        if not os.path.exists(out): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", "22050", "-b:a", "32k", out], check=True)
        audio = "exam-media/audio/%s.mp3" % code
    items = []
    for n in range(1, 61):
        if n <= 35 and not audio: continue
        a = ans[n]
        if a in "√×" or (n <= 10 or 46 <= n <= 50): opts = ["√ Đúng", "× Sai"]; ai = 0 if a == "√" else 1
        elif 21 <= n <= 35: opts = ["Chọn A", "Chọn B", "Chọn C"]; ai = "ABC".index(a)
        elif 16 <= n <= 20: opts = ["Chọn A", "Chọn B", "Chọn C", "Chọn D", "Chọn E"]; ai = "ABCDE".index(a)
        else: opts = ["Chọn A", "Chọn B", "Chọn C", "Chọn D", "Chọn E", "Chọn F"]; ai = "ABCDEF".index(a)
        hint = "nghe audio rồi chọn" if n <= 35 else "xem đề rồi chọn"
        items.append({"kind": kind_of(n), "n": n, "sec": sec_of(n), "q": "Câu %d – %s" % (n, hint), "img": crops[n], "opts": opts, "a": ai})
    return items, audio
codes = sorted({re.search(r"(H2\d{4})", f).group(1) for f in glob.glob(os.path.join(SRC, "*H2*.pdf"))})
papers = [(c, *build(c)) for c in codes]
js = ["  /* HSK 2 – sinh bằng tools/exam/build_hsk2.py từ PDF và audio của đề gốc: mỗi câu là ảnh cắt từ đề. */\n  (function () {\n"]
for code, items, audio in papers:
    js.append("    ZH.addMedia(\"HSK 2\", %s, %s, %s, [25, 22]);\n" % (json.dumps(code), json.dumps(items, ensure_ascii=False), json.dumps(audio)))
js.append("  })();\n")
open(os.path.join(ROOT, "src/js/features/exam-data-zh-hsk2-a.js"), "w").write("".join(js))
print("OK", [(c, bool(a)) for c, _, a in papers])
