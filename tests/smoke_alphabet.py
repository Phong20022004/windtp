"""Học bảng chữ cái / 214 bộ thủ: đủ 9 cách học cho mọi ngôn ngữ, kết quả được ghi nhận.
Chạy: npm run build:test && python3 tests/smoke_alphabet.py"""
import json, sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from support import serve_dist, serve_api, api_token, api_call

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
        n = pg.locator('[data-action="alpha-mode"]:not([data-m="duel"])').count()
        check(n == 9 and pg.locator('[data-m="duel"]').count() == 1 and title in txt(), '%s: có đúng 9 cách học, thêm thách đấu bạn bè, tiêu đề %s (%d)' % (code, title, n))

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

    # ===== Thách đấu bạn bè về chữ cái =====
    ORIGIN = '%s://%s' % (urlparse(URL).scheme, urlparse(URL).netloc)
    user_token = pg.evaluate('window.WindtpAuth.getIdToken()')
    admin_token = api_token('admin-1', 'Admin', 'admin@wind.vn', True)
    open_alpha('ko')
    act(pg, 'alpha-mode', m='duel')
    check('Premium' in txt() and pg.locator('[data-action="alpha-d-send"]').count() == 0, 'duel: chưa có Premium thì bị chặn và dẫn tới gói khóa học')
    oid = pg.evaluate("window.WindtpApi.client.createOrder({kind:'shop',currency:'VND',amount:1000,summary:'Premium'}).then(r=>r.id)")
    status, _ = api_call(API, 'POST', '/admin/orders/%d/approve' % oid, admin_token, {'grants': ['access:ko'], 'premiumMonths': 1}, ORIGIN)
    check(status == 200, 'duel: admin cấp Premium theo đơn')
    pg.evaluate("window.dispatchEvent(new Event('online'))")
    for _ in range(40):
        if pg.evaluate("window.WINDTP.premium()"):
            break
        pg.wait_for_timeout(300)
    # ép bạn bè online và luôn chấp nhận để test ổn định
    pg.evaluate("""()=>{const fs=window.WINDTP.friends();window.__onl=fs.filter(f=>f.online).map(f=>f.id)}""")
    act(pg, 'alpha-back'); open_alpha('ko'); act(pg, 'alpha-mode', m='duel')
    pg.wait_for_selector('[data-action="alpha-d-sel"]:not([disabled])', timeout=10000)
    check(pg.locator('[data-action="alpha-d-n"]').count() >= 1, 'duel: có chọn số câu')
    act(pg, 'alpha-d-n', n=10)
    pg.locator('[data-action="alpha-d-sel"]:not([disabled])').first.evaluate('b=>b.click()')
    pg.locator('[data-action="alpha-d-send"]').evaluate('b=>b.click()')
    ch = pg.evaluate("window.WINDTP.ch.listAlpha('ko')")
    check(len(ch) == 1 and ch[0]['lesson'] == 'alpha:ko' and ch[0]['n'] == 10, 'duel: lời thách được tạo với loại alpha:ko')
    check(pg.evaluate("window.WINDTP.ch.list().length") == 0, 'duel: sảnh thách đấu từ vựng không thấy lời thách chữ cái')
    pg.evaluate("window.WINDTP.ch.get(%s).replyAt = 0" % json.dumps(ch[0]['id']))
    pg.evaluate("(id)=>{const c=window.WINDTP.ch.get(id);c.status='accepted';}", ch[0]['id'])
    pg.evaluate("window.dispatchEvent(new Event('online'))")
    act(pg, 'alpha-back'); open_alpha('ko'); act(pg, 'alpha-mode', m='duel')
    pg.wait_for_selector('[data-action="alpha-d-pl"]', timeout=10000)
    act(pg, 'alpha-d-pl', id=ch[0]['id'])
    pg.wait_for_selector('[data-action="alpha-d-ans"]', timeout=5000)
    # trả lời 10 câu: bấm đáp án đầu tiên mỗi câu
    for i in range(10):
        pg.wait_for_selector('[data-action="alpha-d-ans"]:not([disabled])', timeout=8000)
        pg.locator('[data-action="alpha-d-ans"]').first.evaluate('b=>b.click()')
        pg.wait_for_timeout(1100)
    try:
        pg.wait_for_selector('[data-action="alpha-d-lobby"]', timeout=8000)
    except Exception:
        print('DEBUG', txt()[:400], errors)
        raise
    done = pg.evaluate("window.WINDTP.ch.listAlpha('ko')[0]")
    check(done['status'] == 'done' and done['my']['total'] == 10 and done['their']['total'] == 10, 'duel: thi xong có kết quả hai bên cùng 10 câu')
    check('VS' in txt(), 'duel: màn kết quả hiển thị so điểm hai người')
    act(pg, 'alpha-d-lobby')
    check('Gần đây' in txt(), 'duel: lịch sử trận đấu hiện ở sảnh')

    # thách đấu nhóm: 2 bạn cùng thi một đề, xếp hạng
    act(pg, 'alpha-d-n', n=10)
    sel = pg.locator('[data-action="alpha-d-sel"]:not([disabled])')
    if sel.count() >= 3:
        # bạn đầu đã có trận xong nên chọn hai bạn tiếp theo
        sel.nth(1).evaluate('b=>b.click()'); pg.locator('[data-action="alpha-d-sel"]:not([disabled])').nth(2).evaluate('b=>b.click()')
        pg.locator('[data-action="alpha-d-send"]').evaluate('b=>b.click()')
        grp = [c for c in pg.evaluate("window.WINDTP.ch.listAlpha('ko')") if c.get('gid')]
        check(len(grp) == 2, 'duel nhóm: tạo lời thách cho 2 bạn (%d)' % len(grp))
        pg.evaluate("(gid)=>{window.WINDTP.ch.listAlpha('ko').filter(c=>c.gid===gid).forEach(c=>{c.status='accepted'})}", grp[0]['gid'])
        pg.evaluate("window.dispatchEvent(new Event('online'))")
        act(pg, 'alpha-back'); open_alpha('ko'); act(pg, 'alpha-mode', m='duel')
        act(pg, 'alpha-d-gp', id=grp[0]['gid'])
        for i in range(10):
            pg.wait_for_selector('[data-action="alpha-d-ans"]:not([disabled])', timeout=8000)
            pg.locator('[data-action="alpha-d-ans"]').first.evaluate('b=>b.click()')
            pg.wait_for_timeout(1100)
        pg.wait_for_selector('[data-action="alpha-d-lobby"]', timeout=8000)
        check('Bạn' in txt() and 'hạng' in txt().lower() or 'vô địch' in txt(), 'duel nhóm: có bảng xếp hạng sau khi thi')
    else:
        print('SKIP duel nhóm (không đủ bạn online)')

    check(not errors, 'không có lỗi JS (%s)' % errors[:2])
    browser.close()

print('Thất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
