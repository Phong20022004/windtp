#!/usr/bin/env python3
"""Dựng phần Nghe HSK 4 từ PDF đề (đáp án chữ + bảng đáp án) và mp3 audio thật.
Dùng: python3 -I tools/exam/build_hsk4_listening.py <thư mục PDF/mp3> H41002 H41004 ...
Sinh src/js/features/exam-data-zh-hsk4-f.js và nén audio vào src/exam-media/audio."""
import glob, json, os, re, subprocess, sys
SRC = sys.argv[1]; CODES = sys.argv[2:]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUD = os.path.join(ROOT, "src/exam-media/audio"); os.makedirs(AUD, exist_ok=True)

def pdf_text(code):
    f = glob.glob(os.path.join(SRC, "*-" + code + ".pdf")) + glob.glob(os.path.join(SRC, code + ".pdf"))
    return subprocess.run(["pdftotext", "-layout", f[0], "-"], capture_output=True, text=True).stdout

def parse(code):
    t = pdf_text(code)
    i = t.find("二、阅"); seg = re.sub(r"[ \t]+", " ", t[:i])
    opts = {}
    for m in re.finditer(r"(?<!\d)(\d{2})[．.]\s*A\s*([^\n]*?)\s+B\s*([^\n]*?)\s+C\s*([^\n]*?)\s+D\s*([^\n]*)", seg):
        n = int(m.group(1))
        if 11 <= n <= 45 and n not in opts: opts[n] = [m.group(k).strip() for k in range(2, 6)]
    stm = {}
    for m in re.finditer(r"(?<!\d)(\d{1,2})[．.]\s*★\s*([^（(\n]+)", seg):
        n = int(m.group(1))
        if 1 <= n <= 10 and n not in stm: stm[n] = m.group(2).strip()
    k = t.rfind("卷答案"); key = re.sub(r"[ \t]+", " ", t[k:]) if k >= 0 else ""
    ans = {}
    for m in re.finditer(r"(?<!\d)(\d{1,2})[．.]\s*([A-D√×])", key):
        n = int(m.group(1))
        if 1 <= n <= 45 and n not in ans: ans[n] = m.group(2)
    miss = [n for n in range(1, 46) if n not in ans] + [n for n in range(1, 11) if n not in stm] + [n for n in range(11, 46) if n not in opts]
    if miss: raise SystemExit(code + ": thiếu " + str(sorted(set(miss))))
    return stm, opts, ans

S1 = "Nghe phần 1 (1–10): đúng / sai"; S2 = "Nghe phần 2 (11–25): hội thoại ngắn"; S3 = "Nghe phần 3 (26–45): hội thoại và đoạn dài"
out = ["  /* HSK 4 – Nghe 听力 theo audio gốc: sinh bằng tools/exam/build_hsk4_listening.py (chữ chọn lấy từ PDF đề, đáp án theo bảng đáp án gốc). */\n  (function () {\n    var LA = ZH.LA, TF = [\"对 √\", \"错 ×\"];\n"]
for c in CODES:
    stm, opts, ans = parse(c)
    mp3 = (glob.glob(os.path.join(SRC, "*-" + c + ".mp3")) + glob.glob(os.path.join(SRC, c + ".mp3")))[0]
    dst = os.path.join(AUD, c + ".mp3")
    if not os.path.exists(dst):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", "16000", "-b:a", "24k", dst], check=True)
    items = []
    for n in range(1, 11): items.append("LA(%s, %d, %s, TF, %s)" % ("S1", n, json.dumps("%d．★ %s" % (n, stm[n]), ensure_ascii=False), json.dumps("A" if ans[n] == "√" else "B")))
    for n in range(11, 46): items.append("LA(%s, %d, %s, %s, %s)" % ("S2" if n <= 25 else "S3", n, json.dumps("%d．nghe audio rồi chọn đáp án" % n, ensure_ascii=False), json.dumps(opts[n], ensure_ascii=False), json.dumps(ans[n])))
    out.append("    (function () {\n      var S1 = %s, S2 = %s, S3 = %s;\n      ZH.add(\"HSK 4\", %s, [\n        %s\n      ], \"Nguồn: thư mục ĐỀ THI TIẾNG TRUNG trên Google Drive.\", \"exam-media/audio/%s.mp3\");\n    })();\n" % (json.dumps(S1, ensure_ascii=False), json.dumps(S2, ensure_ascii=False), json.dumps(S3, ensure_ascii=False), json.dumps(c), ",\n        ".join(items), c))
out.append("  })();\n")
open(os.path.join(ROOT, "src/js/features/exam-data-zh-hsk4-f.js"), "w").write("".join(out))
print("OK", CODES)
