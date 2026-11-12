"""Khi bộ nhớ trình duyệt đầy, ứng dụng phải báo người dùng (và không báo dồn dập).
Chạy: npm run build:test && python3 tests/smoke_storage.py"""
import json, sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from support import serve_dist, serve_api

failures = []


def check(cond, label):
    print(('OK   ' if cond else 'FAIL ') + label)
    if not cond:
        failures.append(label)


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
    pg.fill('#lg-email', 'q@b.vn')
    pg.fill('#lg-pw', 'secret1')
    pg.fill('#lg-pw2', 'secret1')
    pg.click('#lg-submit')
    pg.wait_for_timeout(2500)  # để ví và dữ liệu máy chủ tải xong, tránh đồng bộ nền chen vào lúc mô phỏng
    toasts = lambda: pg.evaluate("document.body.innerText.split('Không lưu được dữ liệu').length - 1")
    check(toasts() == 0, '1 bình thường không có cảnh báo lưu')
    # mô phỏng bộ nhớ đầy: mọi setItem đều ném QuotaExceededError
    pg.evaluate("""() => {
        const real = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (String(key).startsWith('windtp-super-app-v2')) throw new DOMException('full', 'QuotaExceededError');
            return real.call(this, key, value);
        };
    }""")
    # Một thay đổi cục bộ bất kỳ (đổi tiền tệ) buộc app ghi vào localStorage
    def local_change(cur):
        pg.evaluate("(c)=>{const b=document.createElement('button');b.dataset.action='set-currency';b.dataset.cur=c;document.body.appendChild(b);b.click();b.remove()}", cur)
    local_change('KRW')
    pg.wait_for_timeout(450)
    check(toasts() >= 1, '2 bộ nhớ đầy thì hiện cảnh báo tiếng Việt')
    # chỉ cảnh báo một lần trong 30 giây dù lưu hỏng liên tiếp
    seen = pg.evaluate("window.__warns = 0, window.addEventListener('windtp:save-failed', () => window.__warns++), 0")
    for i in range(3):
        local_change('JPY' if i % 2 else 'KRW')
        pg.wait_for_timeout(200)
    check(pg.evaluate('window.__warns') == 0, '3 không báo dồn dập: lưu hỏng liên tiếp không phát cảnh báo mới trong 30 giây')
    check(not errors, '4 không có lỗi JS khi lưu thất bại' + ('' if not errors else ': ' + '; '.join(errors[:2])))
    browser.close()

print('Thất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
