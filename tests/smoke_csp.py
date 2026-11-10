"""CSP phải chặn script lạ nhưng không làm hỏng tính năng nào: không có vi phạm CSP khi dùng app, game bài, bài học.
Chạy: npm run build:test && python3 tests/smoke_csp.py"""
import sys
from playwright.sync_api import sync_playwright
from support import serve_dist

failures = []


def check(cond, label):
    print(('OK   ' if cond else 'FAIL ') + label)
    if not cond:
        failures.append(label)


# Vi phạm đến từ chính app (không tính bên thứ ba như Google TTS khi không có mạng ra ngoài)
TRACK = """
window.__csp = [];
document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' | ' + (e.blockedURI || '').slice(0, 60) + ' | ' + (e.sample || '').slice(0, 40)));
"""

with serve_dist() as URL, sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 420, 'height': 900})
    ctx.add_init_script(TRACK)
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)[:160]))
    pg.on('dialog', lambda d: d.dismiss())
    pg.goto(URL, wait_until='load', timeout=240000)
    pg.wait_for_function('window.WindtpAuth && window.WindtpAuth.isSettled()', timeout=60000)
    pg.wait_for_timeout(500)
    if pg.locator('#login-gate [data-mode="register"]').count():
        pg.click('#login-gate [data-mode="register"]')
    pg.fill('#lg-name', 'Người Dùng')
    pg.fill('#lg-email', 'c@b.vn')
    pg.fill('#lg-pw', 'secret1')
    pg.fill('#lg-pw2', 'secret1')
    pg.click('#lg-submit')
    pg.wait_for_timeout(800)

    def violations():
        return pg.evaluate('window.__csp')

    check(not violations(), '1 đăng nhập/đăng ký không vi phạm CSP: %s' % violations()[:2])
    for tab in ['home', 'learn', 'shop', 'entertainment', 'tasks', 'utilities', 'community', 'wallet']:
        pg.evaluate("(t)=>document.querySelector('[data-action=\"goto\"][data-tab=\"'+t+'\"]')?.click()", tab)
        pg.wait_for_timeout(300)
    check(not violations(), '2 duyệt đủ các tab không vi phạm CSP: %s' % violations()[:2])

    # chặn đứng mã lạ: chèn script inline và handler inline phải bị CSP từ chối
    pg.evaluate("""() => {
        const s = document.createElement('script'); s.textContent = 'window.__pwned = 1'; document.body.appendChild(s);
        const d = document.createElement('div'); d.innerHTML = '<img src=x onerror="window.__pwned2=1">'; document.body.appendChild(d);
    }""")
    pg.wait_for_timeout(400)
    check(pg.evaluate('window.__pwned') is None and pg.evaluate('window.__pwned2') is None, '3 script và handler inline lạ bị CSP chặn')
    check(len(violations()) >= 2, '4 hai lần chèn mã lạ đều được ghi nhận là vi phạm')
    pg.evaluate('window.__csp.length = 0')

    # mở game bài (iframe srcdoc + Worker blob) và bài học
    pg.evaluate("document.querySelector('[data-action=\"goto\"][data-tab=\"entertainment\"]')?.click()")
    pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('[data-action=\"open-bbl\"], [data-action=\"play-bbl\"], [data-game=\"bbl\"]')?.click()")
    pg.wait_for_timeout(2500)
    frames = pg.evaluate("document.querySelectorAll('iframe').length")
    check(frames >= 1, '5 game bài mở được trong iframe (%d iframe)' % frames)
    if frames:
        frame = [f for f in pg.frames if f != pg.main_frame]
        ready = bool(frame) and frame[0].evaluate("document.querySelectorAll('script').length") >= 3
        check(ready, '6 iframe game đã nạp script của nó')
    check(not violations(), '7 game bài không vi phạm CSP: %s' % violations()[:3])
    check(not errors, '8 không có lỗi JS' + ('' if not errors else ': ' + '; '.join(errors[:2])))
    browser.close()

print('Thất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
