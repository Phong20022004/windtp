#!/usr/bin/env python3
"""Tách đề JLPT dạng PDF-chữ (pdftotext) + bảng đáp án thành JSON.
Dùng: jlpt_extract.py exam.pdf key.pdf LEVEL PERIOD out.json   (PERIOD dạng 7/2024)
Chỉ lấy phần 文字・語彙 / 文法 / 読解 (phần nghe cần file âm thanh nên không xử lý ở đây)."""
import re, sys, json, subprocess, html, unicodedata

def sh(*a):
    return subprocess.run(a, capture_output=True, text=True, check=True).stdout

def midlab(rows, r):
    """Vị trí nhãn 'Câu N' ở giữa trang: nằm sát một chữ 問題 cùng/gần hàng."""
    out = set()
    for k in range(r - 8, r + 9):
        for x, t, _ in rows.get(k, []):
            if t == "問題" and x > 100:
                for x2, t2, _ in rows.get(r, []):
                    if 0 < x2 - x < 20: out.add((x2, r))
    return out

def key_pages(keypdf):
    """Trả về {(level, 'm/yyyy'): {num: ans}} cho phần không nghe."""
    n = int(re.search(r"Pages:\s+(\d+)", sh("pdfinfo", keypdf)).group(1))
    out = {}
    for p in range(1, n + 1):
        x = sh("pdftotext", "-bbox", "-f", str(p), "-l", str(p), keypdf, "-")
        words = [(float(m[0]), float(m[1]), html.unescape(m[2])) for m in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="[\d.]+">(.*?)</word>', x)]
        lv = next((w[2] for w in words if re.fullmatch(r"N[1-5]", w[2])), None)
        per = [w[2] for w in words if re.fullmatch(r"\d{1,2}/\d{4}", w[2])]
        if not lv or not per: continue
        rows = {}
        for xx, yy, t in words: rows.setdefault(round(yy / 3), []).append((xx, t, yy))
        # bỏ trùng
        listen_x = min([r for r, ws in rows.items() if any(t == "聴解" for _, t, _ in ws)] or [10 ** 9])
        keys = sorted(rows)
        res, used = {}, set()
        for r in keys:
            if r >= listen_x: break
            if r in used: continue
            ints = sorted({(round(x), int(unicodedata.normalize("NFKC", t))) for x, t, _ in rows[r] if re.fullmatch(r"\d{1,3}", t) and t.isascii() and not (x <= 60 or (x, r) in midlab(rows, r))})
            if not ints: continue
            vals = [v for _, v in ints]
            if len(ints) > 1 and not all(vals[i + 1] - vals[i] in (1,) or vals[i + 1] - vals[i] > 1 and abs(ints[i + 1][0] - ints[i][0]) > 100 for i in range(len(ints) - 1)): continue
            for x0, v in ints:
                for k in keys:
                    if k <= r or k > r + 14 or k >= listen_x: continue
                    hit = [t for x, t, _ in rows[k] if abs(x - x0) <= 5 and re.fullmatch(r"[1-4]", t)]
                    if hit:
                        res.setdefault(v, int(hit[0])); used.add(k); break
        for pr in set(per):
            out.setdefault((lv, pr), {}).update(res)
    return out

HEAD = re.compile(r"^\s*N[1-5]\s+\d+/\d{4}\s*$")
def parse_exam(txt):
    txt = txt.translate(str.maketrans("０１２３４５６７８９", "0123456789"))
    lines = [l.rstrip() for l in txt.replace("\f", "\n").split("\n")]
    lines = [l for l in lines if not HEAD.match(l)]
    qs, cur, section, instr, passage, buf, lastctx = [], 0, "", "", [], [], ""
    OPT1 = re.compile(r"^\s*[1-4]\s")
    i = 0
    def opts_from(text):
        pos, o, k = 0, [], 1
        for m in re.finditer(r"(?:(?<=\s)|^)([1-4])(?!\d)\s*", text):
            d = int(m.group(1))
            if d == k or (k == 4 and d == 3 and len(o) == 3):
                o.append((m.start(), m.end())); k += 1
        if len(o) < 4: return None
        res = []
        for j, (s, e) in enumerate(o):
            res.append(text[e:(o[j + 1][0] if j + 1 < 4 else len(text))].strip())
        return res
    while i < len(lines):
        l = lines[i]
        if re.fullmatch(r"\s*\d{1,3}\s*", l) and not (int(l) == cur + 1):
            i += 1; continue
        if re.match(r"^\s*(文字・語彙|文法|読解|聴解)\s*$", l):
            section = l.strip()
            if section == "聴解": break
            i += 1; continue
        if l.strip().startswith("問題") and re.match(r"^\s*問題\s*\d+", l):
            instr = l.strip(); passage = []; buf = []; lastctx = ""
            i += 1; continue
        m = re.match(r"^\s{0,8}(\d{1,2})a?(?:\s*(\S.*))?$", l)
        if m and int(m.group(1)) == cur + 1:
            n = int(m.group(1)); g2 = m.group(2) or ""; stem = [g2.strip()]; j = i + 1; text = ""
            # gom đến khi có đủ 4 đáp án
            body = [g2]
            got = opts_from(g2)
            while got is None and j < len(lines) and j < i + 14:
                if re.match(r"^\s{0,8}(\d{1,2})\s+\S", lines[j]) and int(re.match(r"^\s*(\d+)", lines[j]).group(1)) == n + 1 and not re.match(r"^\s*[1-4]\s", lines[j]): break
                body.append(lines[j]); j += 1
                got = opts_from(" ".join(x.strip() for x in body[1:] if x.strip())) or opts_from(" ".join(x.strip() for x in body if x.strip()))
            if got:
                full = " ".join(x.strip() for x in body if x.strip())
                # tách phần stem trước đáp án '1 '
                m1 = re.search(r"(?:(?<=\s)|^)1\s+", full)
                stemtxt = re.sub(r"\s+", " ", full[:m1.start()]).strip() if m1 else ""
                if not stemtxt:
                    stemtxt = re.sub(r"\s+", " ", " ".join(x.strip() for x in body[:1])).strip()
                ctx = "\n".join(p for p in passage if p.strip()).strip() or lastctx
                lastctx = ctx
                qs.append({"n": n, "sec": section, "instr": instr, "stem": stemtxt, "options": got, "ctx": ctx})
                cur = n; i = j; passage = []; buf = []
                continue
        # văn bản bài đọc
        if (section == "読解" or "文章" in instr) and l.strip():
            passage.append(l.strip())
        i += 1
    return qs

if __name__ == "__main__":
    exam, keyp, lv, per, outp = sys.argv[1:6]
    qs = parse_exam(sh("pdftotext", "-layout", exam, "-"))
    keys = key_pages(keyp).get((lv, per), {})
    for q in qs: q["a"] = keys.get(q["n"])
    json.dump({"level": lv, "period": per, "questions": qs}, open(outp, "w"), ensure_ascii=False)
    miss = [q["n"] for q in qs if not q["a"]]
    print(len(qs), "câu; thiếu đáp án:", miss, "; số khóa:", len(keys))
