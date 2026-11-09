"""Báo cáo giáo trình/quyển còn trống từ vựng. Chạy: python3 tools/audit.py  (cần đã build: npm run build)"""
import re, json, collections, subprocess, os, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'dist', 'WINDTP.html'), encoding='utf-8').read()
def un(t): return re.sub(r'\\u([0-9A-Fa-f]{4})|\\x([0-9A-Fa-f]{2})', lambda m: chr(int(m.group(1) or m.group(2), 16)), t)
i = html.index('BOOK_CATALOG = {'); e = html.index('\n  };', i)
cat = collections.OrderedDict(); cur = None
for line in un(html[i:e]).split('\n')[1:]:
    m = re.match(r'\s{4}(\w+): \[', line)
    if m: cur = m.group(1); cat[cur] = []; continue
    m = re.match(r'\s+\["(.+?)",\s*"[^"]*",\s*\[(.*?)\]\]', line)
    if m: cat[cur].append((m.group(1), re.findall(r'"([^"]*)"', m.group(2))))
# BOOK_LESSONS: lấy bằng node để đọc đúng cú pháp JS
i = html.index('var BOOK_LESSONS = {'); j = html.index('{', i); d = 0; k = j; q = None; esc = False
while True:
    c = html[k]
    if q:
        if esc: esc = False
        elif c == '\\': esc = True
        elif c == q: q = None
    elif c in '"\'`': q = c
    elif c == '{': d += 1
    elif c == '}':
        d -= 1
        if d == 0: break
    k += 1
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
    f.write('const BL=' + html[j:k + 1] + ';console.log(JSON.stringify(BL))'); tmp = f.name
BL = json.loads(subprocess.run(['node', tmp], capture_output=True, text=True, check=True).stdout)
V = {c: json.load(open(os.path.join(ROOT, 'data', 'vocab', c + '.json'), encoding='utf-8')) for c in ['en', 'zh', 'ko', 'fr', 'de', 'ja', 'es']}
empty = 0
for lang, books in cat.items():
    for book, vols in books:
        for vi, vn in enumerate(vols):
            les = V[lang].get(f'{book}|{vi}')
            n = sum(len(b[1]) for b in les) if les else 0
            listed = len(BL.get(f'{lang}|{book}', {}).get(str(vi), []))
            problems = []
            if n == 0: problems.append('KHÔNG CÓ TỪ')
            elif listed != len(les): problems.append(f'danh sách bài lệch ({listed}/{len(les)})')
            if les and any(not b[1] for b in les): problems.append('có bài rỗng')
            if problems: empty += 1; print(f'[{lang}] {book} · {vn}: ' + ', '.join(problems))
print('Tổng quyển có vấn đề:', empty)
sys.exit(1 if empty and '--strict' in sys.argv else 0)
