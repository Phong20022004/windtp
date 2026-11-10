"""Kiểm tra việc tải dữ liệu theo nhu cầu trên trình duyệt headless (qua HTTP), gồm cả mất mạng và tự phục hồi.
Chạy: npm run build:test && python3 tests/smoke_data.py"""
import json, os, re, sys
from playwright.sync_api import sync_playwright
from support import serve_dist

STATE_KEY = 'windtp-super-app-v2'
failures, page_errors = [], []


def check(cond, label):
    print(('OK   ' if cond else 'FAIL ') + label)
    if not cond:
        failures.append(label)


def data_requests(requests, kind):
    return [r for r in requests if re.search(r'/data/%s\.[a-z]{2}\.[0-9a-f]{10}\.json$' % kind, r)]


def langs_of(urls):
    return sorted(re.search(r'\.([a-z]{2})\.[0-9a-f]{10}\.json$', u).group(1) for u in urls)


def settle(pg):
    pg.wait_for_function('window.WindtpAuth && window.WindtpAuth.isSettled()', timeout=60000)
    pg.wait_for_timeout(300)


def new_page(browser, URL, lang=None, routes=None):
    ctx = browser.new_context(viewport={'width': 420, 'height': 900}, bypass_csp=True)  # CSP có test riêng (smoke_csp); wait_for_function dùng eval
    if routes:
        routes(ctx)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: page_errors.append(str(e)[:200]))
    requests = []
    pg.on('request', lambda r: requests.append(r.url))
    pg.goto(URL, wait_until='load', timeout=240000)
    settle(pg)
    if lang:
        # Người dùng đã đăng nhập và chọn ngôn ngữ từ trước: đăng nhập, tải lại để app dựng phiên, rồi ghi ngôn ngữ và tải lại.
        pg.evaluate("window.__fakeAuth.seed({email:'u@b.vn',password:'secret1',name:'U'})")
        pg.evaluate("window.WindtpAuth.login({email:'u@b.vn',password:'secret1',remember:true})")
        pg.wait_for_timeout(500)
        pg.reload(wait_until='load', timeout=240000)
        settle(pg)
        # Dữ liệu cá nhân (gồm lang) nằm ở khóa riêng của từng người dùng, không phải khóa chung.
        pg.evaluate('(a)=>{const k=a[0]+"::u::u@b.vn";const s=JSON.parse(localStorage.getItem(k)||"{}");s.lang=a[1];localStorage.setItem(k,JSON.stringify(s))}', [STATE_KEY, lang])
        requests.clear()
        pg.reload(wait_until='load', timeout=240000)
        settle(pg)
    return ctx, pg, requests


def click_action(pg, action, **data):
    """Bấm một hành động của giao diện (data-action) bằng nút tạm, như người dùng bấm vào nút thật."""
    pg.evaluate("""(a)=>{const b=document.createElement("button");b.dataset.action=a[0];
        Object.entries(a[1]).forEach(([k,v])=>{b.dataset[k]=v});document.body.appendChild(b);b.click();b.remove()}""", [action, {k: str(v) for k, v in data.items()}])


def open_lesson_click(pg, code):
    """Bấm vào một bài miễn phí (quyển 0, bài 0) bằng đúng hành động lesson-open của giao diện."""
    click_action(pg, 'lesson-open', code=code, g=0, v=0, l=0)


with serve_dist() as URL, sync_playwright() as p:
    browser = p.chromium.launch()

    # --- 1) Lần đầu mở, chưa chọn ngôn ngữ: không tải dữ liệu nào ---
    ctx, pg, req = new_page(browser, URL)
    pg.wait_for_timeout(1200)
    check(not data_requests(req, 'vocab') and not data_requests(req, 'daily'), '1 chưa chọn ngôn ngữ thì không tải file từ vựng nào')
    html_size = os.path.getsize(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist', 'test.html'))
    check(html_size < 3_000_000, '2 trang HTML dưới 3 MB (thực tế %.2f MB)' % (html_size / 1e6))
    ctx.close()

    # --- 2) Đã chọn tiếng Hàn: chỉ tải bài ngày tiếng Hàn, chưa tải từ vựng đầy đủ ---
    ctx, pg, req = new_page(browser, URL, lang='ko')
    pg.wait_for_function("window.WindtpData.dailySync('ko') !== null", timeout=30000)
    check(langs_of(data_requests(req, 'daily')) == ['ko'], '3 chỉ tải bài ngày của ngôn ngữ đang chọn (ko)')
    check(not data_requests(req, 'vocab'), '4 chưa mở bài thì chưa tải từ vựng đầy đủ')
    check(pg.evaluate("window.WindtpData.dailySync('ko') !== null && window.WindtpData.dailySync('ko').vocab.length === 2000"), '5 bài ngày tiếng Hàn có 2000 từ bổ sung')
    click_action(pg, 'open-grammar')
    pg.wait_for_timeout(300)
    check('Đang tải bài học' not in pg.inner_text('#modal-host') and len(pg.inner_text('#modal-host')) > 50, '6 đã có dữ liệu thì mở modal ngữ pháp ra nội dung thật')
    click_action(pg, 'close-modal')

    # --- 3) Mở bài bằng giao diện: tải đúng một file từ vựng, rồi bài mở được; mở lại không tải lại ---
    req.clear()
    open_lesson_click(pg, 'ko')
    pg.wait_for_selector('#windtp-en-host', timeout=30000)
    check(langs_of(data_requests(req, 'vocab')) == ['ko'], '7 mở bài tiếng Hàn chỉ tải từ vựng tiếng Hàn')
    pg.evaluate('document.getElementById("windtp-en-host").shadowRoot.querySelector("#x").click()')
    req.clear()
    open_lesson_click(pg, 'ko')
    pg.wait_for_selector('#windtp-en-host', timeout=30000)
    check(not data_requests(req, 'vocab'), '8 mở lại không tải lại (đã nằm trong bộ nhớ)')
    ctx.close()

    # --- 4) Mất mạng khi mở bài: báo lỗi rõ ràng, không mở dở; có mạng lại thì mở được ---
    ctx, pg, req = new_page(browser, URL)
    pg.route('**/data/vocab.es.*', lambda route: route.abort())
    open_lesson_click(pg, 'es')
    pg.wait_for_function("document.body.innerText.includes('Không tải được bài học')", timeout=30000)
    check(pg.locator('#windtp-es-host').count() == 0, '9 mất mạng: báo "Không tải được bài học" và không mở player rỗng')
    check(len(data_requests(req, 'vocab')) == 3, '10 thử tải 3 lần (1 + 2 lần thử lại) rồi mới báo lỗi')
    pg.unroute('**/data/vocab.es.*')
    pg.evaluate("window.dispatchEvent(new Event('online'))")
    open_lesson_click(pg, 'es')
    pg.wait_for_selector('#windtp-es-host', timeout=30000)
    check(True, '11 có mạng lại (sự kiện online) thì mở được bài ngay')
    ctx.close()

    # --- 5) Mất mạng khi tải bài ngày: báo lỗi, modal hiện "đang tải", có mạng lại thì tự tải và tự làm mới modal ---
    ctx, pg, req = new_page(browser, URL, lang='ko', routes=lambda c: c.route('**/data/daily.ko.*', lambda route: route.abort()))
    pg.wait_for_function("document.body.innerText.includes('Không tải được dữ liệu bài học')", timeout=30000)
    check(pg.evaluate("window.WindtpData.dailySync('ko')") is None, '12 mất mạng: báo lỗi và không coi như đã có dữ liệu')
    click_action(pg, 'open-grammar')
    pg.wait_for_timeout(300)
    check('Đang tải bài học' in pg.inner_text('#modal-host'), '13 mở ngữ pháp khi chưa có dữ liệu thì hiện "đang tải", không dựng từ dữ liệu thiếu')
    ctx.unroute('**/data/daily.ko.*')
    pg.evaluate("window.dispatchEvent(new Event('online'))")
    pg.wait_for_function("window.WindtpData.dailySync('ko') !== null", timeout=30000)
    pg.wait_for_function("!document.querySelector('#modal-host').innerText.includes('Đang tải bài học')", timeout=10000)
    check(True, '14 có mạng lại: tự tải bài ngày và tự làm mới modal đang mở, không cần tải lại trang')
    ctx.close()
    # --- 6) Toàn vẹn đầu ra: mọi ảnh đã tách giải mã được, mọi file trong manifest phục vụ được ---
    ctx, pg, req = new_page(browser, URL)
    images = pg.evaluate("""async () => {
        const html = document.documentElement.outerHTML;
        const paths = [...new Set(html.match(/assets\\/[0-9a-f]{10}\\.(?:jpg|png|webp)/g) || [])];
        const broken = [];
        await Promise.all(paths.map((p) => new Promise((resolve) => {
            const im = new Image();
            im.onload = () => { if (!im.naturalWidth) broken.push(p); resolve(); };
            im.onerror = () => { broken.push(p); resolve(); };
            im.src = p;
        })));
        return { total: paths.length, broken };
    }""")
    check(images['total'] >= 70 and not images['broken'], '15 %d ảnh đã tách đều tải và giải mã được%s' % (images['total'], '' if not images['broken'] else ' (hỏng: %s)' % images['broken'][:3]))
    statuses = pg.evaluate("""async () => {
        const m = JSON.parse(document.getElementById('windtp-data-manifest').textContent);
        const urls = [...Object.values(m.vocab), ...Object.values(m.daily)];
        return Promise.all(urls.map(async (u) => (await fetch(u, { method: 'HEAD' })).status));
    }""")
    check(len(statuses) == 14 and all(code == 200 for code in statuses), '16 cả 14 file dữ liệu trong manifest đều phục vụ được (HTTP 200)')
    ctx.close()
    browser.close()

check(not page_errors, 'Không có lỗi JS trên trang' + ('' if not page_errors else ': ' + '; '.join(page_errors)))
print('Thất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
