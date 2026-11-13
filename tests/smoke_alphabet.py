"""Học bảng chữ cái / 214 bộ thủ: đủ 9 cách học cho mọi ngôn ngữ, kết quả được ghi nhận.
Chạy: npm run build:test && python3 tests/smoke_alphabet.py"""
import json, sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from support import serve_dist, serve_api

failures = []


def check(cond, label):
    print(('OK   ' if cond else 'FAIL ') + label)
    if not cond:
        failures.append(label)


def act(pg, name, **data):
    attrs = ''.join(';b.dataset.%s=%s' % (k, json.dumps(str(v))) for k, v in data.items())
    pg.evaluate("()=>{const b=document.createElement('button');b.dataset.action=%s%s;document.body.appendChild(b);b.click();b.remove()}" % (json.dumps(name), attrs))


with serve_dist() as URL, sync_playwright() as p, serve_api('%s://%s' % (urlparse(URL).scheme, urlparse(URL).netloc)) as API:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 420, 'height': 900}, bypass_csp=True)
    ctx.add_init_script('window.__WINDTP_API_URL__ = %s' % json.dumps(API))
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)[:160]))
    pg.goto(URL, wait_until='load', timeout=240000)
    pg.wait_for_function('window.WindtpAuth && window.WindtpAuth.isSettled()', timeout=60000)
    if pg.locator('#login-gate [data-mode="register"]').count():
        pg.click('#login-gate [data-mode="register"]')
    pg.fill('#lg-name', 'Người Dùng')
    pg.fill('#lg-email', 'al@b.vn')
    pg.fill('#lg-pw', 'secret1')
    pg.fill('#lg-pw2', 'secret1')
    pg.click('#lg-submit')
    pg.wait_for_timeout(2500)
    txt = lambda: pg.evaluate("document.querySelector('#tab-learn').innerText")
    html = lambda: pg.evaluate("document.querySelector('#tab-learn').innerHTML")

    def open_alpha(code):
        act(pg, 'goto', tab='learn')
        act(pg, 'select-lang', code=code)
        pg.wait_for_selector('[data-action="open-alphabet"]', timeout=10000)
        act(pg, 'open-alphabet')
        pg.wait_for_selector('[data-action="alpha-mode"]', timeout=10000)

    for code, title in [('ko', 'Hangul'), ('ja', 'Hiragana'), ('zh', '214 bộ thủ'), ('en', 'tiếng Anh'), ('de', 'tiếng Đức'), ('fr', 'tiếng Pháp'), ('es', 'Tây Ban Nha')]:
        open_alpha(code)
        n = pg.locator('[data-action="alpha-mode"]').count()
        check(n == 9 and title in txt(), '%s: có đúng 9 cách học và tiêu đề %s (%d)' % (code, title, n))

    # tiếng Trung: 214 thẻ bộ thủ
    open_alpha('zh')
    act(pg, 'alpha-mode', m='cards')
    check(pg.locator('[data-action="alpha-pick"]').count() == 214, 'zh: thẻ chữ liệt kê đủ 214 bộ thủ')
    act(pg, 'alpha-pick', i=0)
    check('Nhất' in txt() and 'yī' in txt(), 'zh: bấm thẻ thấy pinyin và âm Hán Việt')

    # trắc nghiệm nhìn chữ chọn âm: chọn đúng đáp án thì ghi nhận tiến độ
    open_alpha('ko')
    act(pg, 'alpha-mode', m='see')
    pg.wait_for_selector('[data-action="alpha-ans"]', timeout=5000)
    check(pg.locator('[data-action="alpha-ans"]').count() == 4, 'ko: trắc nghiệm có 4 đáp án')
    pg.locator('[data-action="alpha-ans"]').first.evaluate('b=>b.click()')
    check('Chính xác' in txt() or 'Chưa đúng' in txt(), 'ko: trả lời xong có phản hồi đúng/sai')
    saved = pg.evaluate("""()=>{for(const k of Object.keys(localStorage)){try{const o=JSON.parse(localStorage.getItem(k));if(o&&o.alpha&&o.alpha.ko)return Object.keys(o.alpha.ko).length}catch(e){}}return 0}""")
    check(int(saved) == 1, 'ko: kết quả câu hỏi được lưu theo từng chữ')

    # gõ lại: tiếng Hàn gõ cách đọc, tiếng Anh nghe rồi gõ chữ cái
    open_alpha('zh')
    act(pg, 'alpha-mode', m='type')
    pg.wait_for_selector('#alpha-type', timeout=5000)
    ch = pg.evaluate("document.querySelector('#tab-learn .font-black span').textContent")
    pg.fill('#alpha-type', 'zzzz')
    pg.click('[data-action="alpha-check"]')
    check('Chưa đúng' in txt(), 'zh: gõ sai bị báo sai và hiện đáp án')

    # ghép cặp có 6 cặp
    open_alpha('ja')
    act(pg, 'alpha-mode', m='match')
    check(pg.locator('[data-action="alpha-mleft"]').count() == 6 and pg.locator('[data-action="alpha-mright"]').count() == 6, 'ja: ghép cặp có 6 chữ và 6 cách đọc')

    # tập viết: vẽ lên canvas thì không bị vẽ lại làm mất nét
    open_alpha('ko')
    act(pg, 'alpha-mode', m='write')
    pg.wait_for_selector('#alpha-canvas', timeout=5000)
    box = pg.locator('#alpha-canvas').bounding_box()
    pg.mouse.move(box['x'] + 40, box['y'] + 40); pg.mouse.down(); pg.mouse.move(box['x'] + 200, box['y'] + 200, steps=8); pg.mouse.up()
    pg.evaluate("window.dispatchEvent(new Event('online'))")
    pg.wait_for_timeout(400)
    drawn = pg.evaluate("(()=>{const c=document.querySelector('#alpha-canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=4)if(d[i]>0)return true;return false})()")
    check(drawn, 'ko: nét viết tay còn nguyên sau khi giao diện làm mới')

    # ôn chữ hay sai: có chữ sau khi trả lời sai
    act(pg, 'alpha-back')
    act(pg, 'alpha-mode', m='weak')
    check('Chưa có chữ hay sai' in txt() or pg.locator('[data-action="alpha-ans"]').count() == 4, 'ko: ôn chữ hay sai hiển thị đúng trạng thái')

    check(not errors, 'không có lỗi JS (%s)' % errors[:2])
    browser.close()

print('Thất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
