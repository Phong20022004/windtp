"""Báo cáo nội dung, xuất dữ liệu và xóa tài khoản trên trình duyệt thật với máy chủ ví thật.
Chạy: npm run build:test && python3 tests/smoke_privacy.py"""
import json, sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from support import serve_dist, serve_api, api_call, api_token

failures, page_errors = [], []


def check(cond, label):
    print(('OK   ' if cond else 'FAIL ') + label)
    if not cond:
        failures.append(label)


def open_page(ctx, api):
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: page_errors.append(str(e)[:200]))
    pg.add_init_script('window.__WINDTP_API_URL__ = %s' % json.dumps(api))
    pg.goto(URL, wait_until='load', timeout=240000)
    pg.wait_for_function('window.WindtpAuth && window.WindtpAuth.isSettled()', timeout=60000)
    return pg


def login(pg, email, password):
    pg.click('#login-gate [data-mode="login"]')
    pg.fill('#lg-email', email)
    pg.fill('#lg-pw', password)
    pg.click('#lg-submit')
    pg.wait_for_function('!document.getElementById("login-gate")', timeout=20000)


def click_action(pg, action, **data):
    pg.evaluate('''([a, d]) => { const b = document.createElement("button"); b.dataset.action = a;
      Object.keys(d).forEach((k) => { b.dataset[k] = d[k]; }); document.body.appendChild(b); b.click(); b.remove(); }''', [action, data])


def eventually(fn, ms=10000):
    import time
    end = time.time() + ms / 1000
    while True:
        try:
            if fn():
                return True
        except Exception:
            pass
        if time.time() > end:
            return False
        time.sleep(0.15)


with serve_dist() as URL, sync_playwright() as p:
    ORIGIN = '%s://%s' % (urlparse(URL).scheme, urlparse(URL).netloc)
    with serve_api(ORIGIN) as API:
        browser = p.chromium.launch()
        ctx_admin = browser.new_context(viewport={'width': 420, 'height': 900}, bypass_csp=True, accept_downloads=True)
        ctx_user = browser.new_context(viewport={'width': 420, 'height': 900}, bypass_csp=True, accept_downloads=True)

        adm = open_page(ctx_admin, API)
        adm.evaluate("window.__fakeAuth.seed({email:'boss@wind.vn',password:'secret1',name:'Boss',admin:true})")
        login(adm, 'boss@wind.vn', 'secret1')
        admin_token = api_token('uid-0', 'Boss', 'boss@wind.vn', True)

        usr = open_page(ctx_user, API)
        usr.evaluate("window.__fakeAuth.seed({email:'boss@wind.vn',password:'secret1',name:'Boss',admin:true})")
        usr.evaluate("window.__fakeAuth.seed({email:'hs@wind.vn',password:'secret1',name:'Hoc Sinh',admin:false})")
        login(usr, 'hs@wind.vn', 'secret1')
        usr.wait_for_timeout(1500)

        status, made = api_call(API, 'POST', '/posts', admin_token, {'text': 'Bài thông báo của quản trị'}, ORIGIN)
        check(status == 200, 'P1 admin đăng bài')
        post_id = made['id']

        # Người dùng tải lại dữ liệu cộng đồng rồi báo cáo bài
        usr.evaluate("window.dispatchEvent(new Event('online'))")
        click_action(usr, 'goto', tab='community')
        check(eventually(lambda: usr.query_selector('[data-action="report"][data-kind="post"]') is not None), 'P2 bài của người khác có nút báo cáo')
        click_action(usr, 'report', kind='post', id='s%d' % post_id)
        usr.wait_for_selector('#rp-reason', timeout=5000)
        usr.select_option('#rp-reason', 'Spam hoặc quảng cáo')
        usr.fill('#rp-note', 'quảng cáo lạ')
        usr.click('[data-action="report-send"]')
        check(eventually(lambda: len(api_call(API, 'GET', '/admin/reports', admin_token, origin=ORIGIN)[1]['reports']) == 1), 'P3 báo cáo đã tới máy chủ')
        rep = api_call(API, 'GET', '/admin/reports', admin_token, origin=ORIGIN)[1]['reports'][0]
        check('Spam' in rep['reason'] and 'quảng cáo lạ' in rep['reason'], 'P4 lý do và ghi chú được lưu')

        # Admin xem và gỡ nội dung bị báo cáo
        adm.evaluate("window.dispatchEvent(new Event('online'))")
        adm.wait_for_timeout(1500)
        click_action(adm, 'open-moderation')
        check(eventually(lambda: 'Báo cáo vi phạm · 1' in adm.locator('#modal-host').inner_text()), 'P5 admin thấy báo cáo trong khu kiểm duyệt')
        adm.click('[data-action="report-resolve"][data-remove="1"]')
        check(eventually(lambda: len(api_call(API, 'GET', '/admin/reports', admin_token, origin=ORIGIN)[1]['reports']) == 0), 'P6 báo cáo đã xử lý')
        check(all(x['id'] != post_id for x in api_call(API, 'GET', '/posts', admin_token, origin=ORIGIN)[1]['posts']), 'P7 bài bị gỡ không còn trên bảng tin')

        # Xuất dữ liệu
        click_action(usr, 'open-settings')
        usr.wait_for_selector('[data-action="export-data"]', timeout=5000)
        with usr.expect_download(timeout=10000) as dl:
            usr.click('[data-action="export-data"]')
        path = dl.value.path()
        data = json.load(open(path, encoding='utf-8'))
        check(data.get('uid') == 'uid-1' and 'wallet' in data and 'transactions' in data, 'P8 bản sao dữ liệu có đủ mục chính')

        # Xóa tài khoản: sai xác nhận không xóa; đúng thì đăng xuất và không đăng nhập lại được
        usr.click('[data-action="open-delete-account"]')
        usr.wait_for_selector('#del-confirm', timeout=5000)
        usr.fill('#del-pw', 'secret1')
        usr.fill('#del-confirm', 'khong')
        usr.click('[data-action="delete-account-go"]')
        usr.wait_for_timeout(500)
        check(usr.query_selector('#del-confirm') is not None and usr.query_selector('#login-gate') is None, 'P9 chưa gõ XOA thì không xóa')
        usr.fill('#del-pw', 'sai-mat-khau')
        usr.fill('#del-confirm', 'XOA')
        usr.click('[data-action="delete-account-go"]')
        usr.wait_for_timeout(800)
        check(usr.query_selector('#login-gate') is None, 'P10 sai mật khẩu thì không xóa')
        usr.fill('#del-pw', 'secret1')
        usr.click('[data-action="delete-account-go"]')
        check(eventually(lambda: usr.query_selector('#login-gate') is not None, 15000), 'P11 xóa xong thì quay về màn đăng nhập')
        usr.click('#login-gate [data-mode="login"]')
        usr.fill('#lg-email', 'hs@wind.vn')
        usr.fill('#lg-pw', 'secret1')
        usr.click('#lg-submit')
        usr.wait_for_timeout(1000)
        check(usr.query_selector('#login-gate') is not None, 'P12 không đăng nhập lại được bằng tài khoản đã xóa')
        browser.close()

check(not page_errors, 'P13 không có lỗi JS (%s)' % page_errors[:2])
print('Thất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
