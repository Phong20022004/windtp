"""Khi bộ nhớ trình duyệt đầy, ứng dụng phải báo người dùng (và không báo dồn dập).
Chạy: npm run build:test && python3 tests/smoke_storage.py"""
import sys
from playwright.sync_api import sync_playwright
from support import serve_dist

failures = []


def check(cond, label):
    print(('OK   ' if cond else 'FAIL ') + label)
    if not cond:
        failures.append(label)


with serve_dist() as URL, sync_playwright() as p:
    browser = p.chromium.launch()
    pg = browser.new_context(viewport={'width': 420, 'height': 900}).new_page()
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
    pg.wait_for_timeout(800)
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
    pg.evaluate("document.querySelector('[data-action=\"goto\"][data-tab=\"community\"]')?.click()")
    pg.wait_for_timeout(300)
    pg.fill('#post-draft', 'Bài thử, đủ dài để được đăng')
    pg.evaluate("document.querySelector('[data-action=\"publish-post\"]')?.click()")
    pg.wait_for_timeout(450)
    check(toasts() >= 1, '2 bộ nhớ đầy thì hiện cảnh báo tiếng Việt')
    # chỉ cảnh báo một lần trong 30 giây dù lưu hỏng liên tiếp
    seen = pg.evaluate("window.__warns = 0, window.addEventListener('windtp:save-failed', () => window.__warns++), 0")
    for i in range(3):
        pg.fill('#post-draft', 'Bài thử tiếp số %d' % i)
        pg.evaluate("document.querySelector('[data-action=\"publish-post\"]')?.click()")
        pg.wait_for_timeout(200)
    check(pg.evaluate('window.__warns') == 0, '3 không báo dồn dập: lưu hỏng liên tiếp không phát cảnh báo mới trong 30 giây')
    check(not errors, '4 không có lỗi JS khi lưu thất bại' + ('' if not errors else ': ' + '; '.join(errors[:2])))
    browser.close()

print('Thất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
