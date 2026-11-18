#!/usr/bin/env python3
"""Gộp các file jlpt_extract.py thành data/exams/jlpt-<level>.json (chỉ lấy đề tách đủ câu + đủ đáp án).
Dùng: jlpt_build.py LEVEL out.json in1.json in2.json ..."""
import json, re, sys

def clean_ctx(t):
    keep = []
    for l in t.split("\n"):
        s = l.strip()
        if not s: continue
        if len(s) <= 14 and not re.search(r"[。、「」（）()【】一-鿿ァ-ヶ]", s) and re.fullmatch(r"[ぁ-ん\s]+", s): continue  # dòng furigana
        keep.append(s)
    return "\n".join(keep)

def main():
    level, out, *ins = sys.argv[1:]
    exams = []
    for f in ins:
        d = json.load(open(f)); qs = d["questions"]
        if any(len(q["options"]) != 4 or q["a"] not in (1, 2, 3, 4) or not (q["stem"] or q["sec"] == "文法") for q in qs): continue
        mo, yr = d["period"].split("/")
        passages, items = [], []
        for q in qs:
            if any(not x.strip() or re.search(r"\s{3,}\d\s", x) for x in q["options"]): continue  # tách đáp án bị lẫn số trong nội dung
            ctx = clean_ctx(q["ctx"]) if q["ctx"] else ""
            p = None
            if ctx:
                if ctx not in passages: passages.append(ctx)
                p = passages.index(ctx)
            if q["sec"] == "読解" and (p is None or len(passages[p]) < 80): continue  # đề cần hình/bảng không có trong PDF chữ
            it = {"n": q["n"], "s": q["sec"], "i": re.sub(r"\s+", " ", q["instr"]).strip(), "q": q["stem"], "o": q["options"], "a": q["a"]}
            if p is not None: it["p"] = p
            items.append(it)
        exams.append({"id": f"{level.lower()}-{yr}-{int(mo):02d}", "period": d["period"], "year": int(yr), "month": int(mo), "passages": passages, "questions": items})
    exams.sort(key=lambda e: (e["year"], e["month"]))
    json.dump({"level": level, "exams": exams}, open(out, "w"), ensure_ascii=False, separators=(",", ":"))
    print(len(exams), "đề,", sum(len(e["questions"]) for e in exams), "câu")
main()
