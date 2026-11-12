"""Kiểm tra nhanh trên trình duyệt headless: mở bài ở các ngôn ngữ, chạy các chế độ học.
Chạy: pip install playwright && playwright install chromium && python3 tests/smoke.py"""
import os, sys
from playwright.sync_api import sync_playwright
from support import serve_dist
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'WINDTP.test.html')
CASES = [  # (hàm mở bài, key, vol, bài, host id)
    ('__esOpen', 'Aula Internacional|0', 0, 1, 'windtp-es-host'),
    ('__esOpen', 'Cấu trúc ngữ pháp|0', 0, 3, 'windtp-es-host'),
    ('__enOpen', 'Yonsei Reading / Listening|0', 0, 1, 'windtp-en-host'),
    ('__enOpen', 'Yonsei Reading / Listening|5', 5, 0, 'windtp-en-host'),
]
import json, os
FULL = {c: json.load(open(os.path.join(os.path.dirname(__file__), '..', 'premium-content', 'vocab', c + '.json'), encoding='utf-8')) for c in ('es', 'ko')}
errs = []
with serve_dist() as URL, sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 420, 'height': 900})
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.add_init_script("window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+(e.sample||'').slice(0,40)))")
    pg.goto(URL, wait_until='load', timeout=240000); pg.wait_for_timeout(1500)
    for fn, key, vol, les, host in CASES:
        lang = 'ko' if 'Yonsei' in key else 'es'
        # Bài trả phí không còn nằm trong trang: giả lập người đã có quyền bằng bản đầy đủ do build xuất ra (kiểm tra quyền nằm ở smoke_economy).
        pg.evaluate('(a)=>window.WindtpData.setVocab(a[0],a[1])', [lang, FULL[lang]])
        ok = pg.evaluate('(a)=>window[a[0]](a[1],a[2],a[3],{book:a[1].split("|")[0],vol:"X",lang:a[4]})', [fn, key, vol, les, lang])
        pg.wait_for_timeout(500)
        for m in ['flash', 'quiz', 'type', 'read', 'match']:
            pg.evaluate('(a)=>{const r=document.getElementById(a[0]).shadowRoot;const b=r.querySelector(\'#tabs button[data-m="\'+a[1]+\'"]\');if(b)b.click()}', [host, m])
            pg.wait_for_timeout(200)
        print('OK' if ok else 'FAIL', key, 'bài', les)
        if not ok: errs.append('không mở được ' + key)
        pg.evaluate('(h)=>document.getElementById(h).shadowRoot.querySelector("#x").click()', host)
    csp = pg.evaluate('window.__csp')
    if csp: errs.append('vi phạm CSP: %s' % csp[:3])
    b.close()
print('Lỗi JS:', errs or 'không có'); sys.exit(1 if errs else 0)
