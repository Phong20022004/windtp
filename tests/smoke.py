"""Kiểm tra nhanh trên trình duyệt headless: mở bài ở các ngôn ngữ, chạy các chế độ học.
Chạy: pip install playwright && playwright install chromium && python3 tests/smoke.py"""
import os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'WINDTP.html')
CASES = [  # (hàm mở bài, key, vol, bài, host id)
    ('__esOpen', 'Aula Internacional|0', 0, 1, 'windtp-es-host'),
    ('__esOpen', 'Cấu trúc ngữ pháp|0', 0, 3, 'windtp-es-host'),
    ('__enOpen', 'Yonsei Reading / Listening|0', 0, 1, 'windtp-en-host'),
    ('__enOpen', 'Yonsei Reading / Listening|5', 5, 0, 'windtp-en-host'),
]
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 420, 'height': 900})
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(URL, wait_until='load', timeout=240000); pg.wait_for_timeout(2500)
    for fn, key, vol, les, host in CASES:
        lang = 'ko' if 'Yonsei' in key else 'es'
        ok = pg.evaluate('(a)=>window[a[0]](a[1],a[2],a[3],{book:a[1].split("|")[0],vol:"X",lang:a[4]})', [fn, key, vol, les, lang])
        pg.wait_for_timeout(500)
        for m in ['flash', 'quiz', 'type', 'read', 'match']:
            pg.evaluate('(a)=>{const r=document.getElementById(a[0]).shadowRoot;const b=r.querySelector(\'#tabs button[data-m="\'+a[1]+\'"]\');if(b)b.click()}', [host, m])
            pg.wait_for_timeout(200)
        print('OK' if ok else 'FAIL', key, 'bài', les)
        pg.evaluate('(h)=>document.getElementById(h).shadowRoot.querySelector("#x").click()', host)
    b.close()
print('Lỗi JS:', errs or 'không có'); sys.exit(1 if errs else 0)
