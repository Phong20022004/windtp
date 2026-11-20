#!/usr/bin/env python3
"""Dựng đề HSK 1 có hình và audio thật từ PDF + mp3 người dùng cung cấp.
Dùng: python3 -I tools/exam/build_hsk1.py <thư mục chứa PDF/mp3>
Sinh: src/exam-media/img/*.jpg, src/exam-media/audio/*.mp3 (nén mono) và src/js/features/exam-data-zh-hsk1-{a,b}.js
Mỗi câu là ảnh cắt từ chính đề (hình + chữ + pinyin), thí sinh chọn chữ cái / √ × theo bảng đáp án gốc."""
import glob, json, os, re, subprocess, sys
import pdfplumber, pypdfium2 as pdfium

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMG = os.path.join(ROOT, "src/exam-media/img"); AUD = os.path.join(ROOT, "src/exam-media/audio")
os.makedirs(IMG, exist_ok=True); os.makedirs(AUD, exist_ok=True)
SCALE = 1.6
FOOT = 770

def find(code, ext):
    hits = glob.glob(os.path.join(SRC, "*-" + code + "." + ext)) + glob.glob(os.path.join(SRC, code + "." + ext))
    return hits[0] if hits else None

def part_of(n):
    """(kỹ năng, mục, tiêu đề, kiểu cắt, đáp án gồm)"""
    if n <= 5: return ("listening", "Nghe phần 1 (1–5): hình đúng / sai", "rows", "tf")
    if n <= 10: return ("listening", "Nghe phần 2 (6–10): chọn hình", "rows", "abc")
    if n <= 15: return ("listening", "Nghe phần 3 (11–15): ghép hình", "section", "af")
    if n <= 20: return ("listening", "Nghe phần 4 (16–20): chọn đáp án", "section", "abc")
    if n <= 25: return ("reading", "Đọc phần 1 (21–25): hình đúng / sai", "rows", "tf")
    if n <= 30: return ("reading", "Đọc phần 2 (26–30): ghép hình", "section", "af")
    if n <= 35: return ("reading", "Đọc phần 3 (31–35): ghép câu", "section", "af")
    return ("reading", "Đọc phần 4 (36–40): điền từ", "section", "af")

def answers(pdf):
    key = pdf.pages[-1].extract_text() or ""
    out = {}
    for n, a in re.findall(r"(\d{1,2})\s*[．.]\s*([A-F√×])", key):
        out.setdefault(int(n), a)
    return out

def build(code):
    pdfp = find(code, "pdf"); mp3 = find(code, "mp3")
    pdf = pdfplumber.open(pdfp); doc = pdfium.PdfDocument(pdfp)
    ans = answers(pdf)
    if len(ans) != 40: raise SystemExit(code + ": bảng đáp án chỉ có %d câu" % len(ans))
    crops = {}  # n -> file
    for pi, pg in enumerate(pdf.pages):
        words = pg.extract_words()
        text = pg.extract_text() or ""
        if "听力材料" in text.replace(" ", "") or "答案" in text or "材料" in text[:60] or "听听" in text: break
        # tiêu đề "第 a-b 题"
        hdr = None
        for w in words:
            pass
        m = re.search(r"第\s*(\d+)\s*[-–]\s*(\d+)\s*题", text)
        hdr_bottom = 60
        if m:
            for w in words:
                if w["text"].startswith("第") and re.search(r"\d", "".join(x["text"] for x in words if abs(x["top"] - w["top"]) < 3)) and w["top"] > 100:
                    hdr_bottom = w["bottom"] + 6; break
        labels = []
        for w in words:
            mm = re.match(r"^(\d{1,2})[．.]", w["text"])
            if mm and w["x0"] < 125 and 1 <= int(mm.group(1)) <= 40 and w["top"] > hdr_bottom - 4:
                labels.append((int(mm.group(1)), (w["top"] + w["bottom"]) / 2))
        if not labels: continue
        render = doc[pi].render(scale=SCALE).to_pil().convert("RGB")
        def crop(top, bottom, name):
            top = max(0, top); bottom = min(pg.height, bottom)
            im = render.crop((int(40 * SCALE), int(top * SCALE), int((pg.width - 40) * SCALE), int(bottom * SCALE)))
            im.save(os.path.join(IMG, name), "JPEG", quality=72, optimize=True)
            return "exam-media/img/" + name
        hy = sorted({round(e["top"]) for e in pg.horizontal_edges if e["x1"] - e["x0"] > 150})
        labels.sort(key=lambda x: x[1])
        sections_done = set()
        # hàng ảnh: gom các ảnh nhúng theo khoảng dọc chồng nhau; hàng cuối cùng khớp với số câu cuối
        clusters = []
        for im in sorted(pg.images, key=lambda i: i["top"]):
            if clusters and im["top"] < clusters[-1][1] - 2: clusters[-1][1] = max(clusters[-1][1], im["bottom"])
            else: clusters.append([im["top"], im["bottom"]])
        row_labels = [(n, y) for n, y in labels if part_of(n)[2] == "rows"]
        rowmap = {}
        if row_labels:
            k = len(row_labels); use = clusters[-k:]
            if len(use) != k: raise SystemExit("%s trang %d: %d nhãn nhưng %d hàng ảnh" % (code, pi + 1, k, len(use)))
            for j, (n, y) in enumerate(sorted(row_labels, key=lambda x: x[0])):
                t, bt = use[j]
                top = (use[j - 1][1] + t) / 2 if j else max(hdr_bottom, t - 14)
                bottom = min(bt + 52, use[j + 1][0] - 4) if j + 1 < k else min(FOOT, bt + 52)
                rowmap[n] = (top, bottom)
        for idx, (n, y) in enumerate(labels):
            kind, sec, mode, ty = part_of(n)
            if mode == "rows":
                top, bottom = rowmap[n]
                crops[n] = crop(top, bottom, "%s-q%d.jpg" % (code, n))
            else:
                a = 11 if n <= 15 else 16 if n <= 20 else 26 if n <= 30 else 31 if n <= 35 else 36
                a, b = {11: (11, 15), 16: (16, 20), 26: (26, 30), 31: (31, 35), 36: (36, 40)}[a]
                if a not in sections_done:
                    f = crop(hdr_bottom, FOOT, "%s-s%d.jpg" % (code, a)); sections_done.add(a)
                    for k in range(a, b + 1): crops[k] = f
    missing = [n for n in range(1, 41) if n not in crops]
    if missing: raise SystemExit(code + ": thiếu hình câu " + str(missing))
    # audio nén mono
    out = os.path.join(AUD, code + ".mp3")
    if mp3 and not os.path.exists(out):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", "22050", "-b:a", "32k", out], check=True)
    items = []
    for n in range(1, 41):
        kind, sec, mode, ty = part_of(n)
        a = ans[n]
        if ty == "tf": opts = ["√ Đúng", "× Sai"]; ai = 0 if a == "√" else 1
        elif ty == "abc": opts = ["Chọn A", "Chọn B", "Chọn C"]; ai = "ABC".index(a)
        else: opts = ["Chọn A", "Chọn B", "Chọn C", "Chọn D", "Chọn E", "Chọn F"]; ai = "ABCDEF".index(a)
        hint = "nghe audio rồi chọn" if kind == "listening" else "xem đề rồi chọn"
        items.append({"kind": kind, "n": n, "sec": sec, "q": "Câu %d – %s" % (n, hint), "img": crops[n], "opts": opts, "a": ai})
    return items, ("exam-media/audio/%s.mp3" % code) if mp3 else ""

codes = sorted({re.search(r"(H1\d{4})", f).group(1) for f in glob.glob(os.path.join(SRC, "*H1*.pdf"))})
papers = [(c, *build(c)) for c in codes]
for tag, chunk in (("a", papers[:6]), ("b", papers[6:])):
    js = ["  /* HSK 1 – sinh bằng tools/exam/build_hsk1.py từ PDF và audio của đề gốc: mỗi câu là ảnh cắt từ đề. */\n  (function () {\n"]
    for code, items, audio in chunk:
        js.append("    ZH.addMedia(\"HSK 1\", %s, %s, %s);\n" % (json.dumps(code), json.dumps(items, ensure_ascii=False), json.dumps(audio)))
    js.append("  })();\n")
    open(os.path.join(ROOT, "src/js/features/exam-data-zh-hsk1-%s.js" % tag), "w").write("".join(js))
print("OK", [c for c, _, _ in papers])
