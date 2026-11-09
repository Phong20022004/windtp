"""Kiểm tra luồng xác thực trên trình duyệt headless, dùng build có backend giả (dist/WINDTP.test.html).
Chạy: npm run build:test && python3 tests/smoke_auth.py
Không chạm tới Firebase thật; logic Firebase được phủ bởi tests/auth/*.test.ts (ánh xạ lỗi) và bản build production."""
import json, os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + os.path.join(ROOT, 'dist', 'WINDTP.test.html')
STATE_KEY = 'windtp-super-app-v2'
FORGED_ADMIN_EMAIL = 'windlord20022004@gmail.com'

failures, page_errors = [], []


def check(cond, label):
    print(('OK   ' if cond else 'FAIL ') + label)
    if not cond:
        failures.append(label)


def open_page(ctx):
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: page_errors.append(str(e)[:200]))
    pg.goto(URL, wait_until='load', timeout=240000)
    settle(pg)
    return pg


def reload(pg):
    pg.reload(wait_until='load', timeout=240000)
    settle(pg)


def settle(pg):
    pg.wait_for_function('window.WindtpAuth && window.WindtpAuth.isSettled()', timeout=60000)
    pg.wait_for_timeout(400)


def gate_visible(pg):
    return pg.locator('#login-gate').count() > 0


def saved_account(pg):
    return pg.evaluate('(k)=>{const r=localStorage.getItem(k);return r?JSON.parse(r).account:null}', STATE_KEY)


def error_text(pg):
    return pg.locator('#lg-err').inner_text().strip()


def fill_form(pg, **fields):
    for field_id, value in fields.items():
        pg.fill('#' + field_id.replace('_', '-'), value)


def submit(pg):
    pg.click('#lg-submit')
    pg.wait_for_timeout(500)


def to_mode(pg, mode):
    pg.click('#login-gate [data-mode="%s"]' % mode)


with sync_playwright() as p:
    browser = p.chromium.launch()
    new_ctx = lambda: browser.new_context(viewport={'width': 420, 'height': 900})

    # --- Luồng A: đăng ký, khôi phục phiên, đăng xuất, đăng nhập, Google, quên mật khẩu ---
    ctx = new_ctx()
    pg = open_page(ctx)
    check(gate_visible(pg), 'A1 mở lần đầu hiện cổng đăng nhập')

    pg.click('#lg-forgot')
    check(not pg.locator('#lg-pwgrid').is_visible(), 'A2 chế độ quên mật khẩu ẩn ô mật khẩu')
    fill_form(pg, lg_email='a@b.vn')
    submit(pg)
    check(pg.evaluate('window.__fakeAuth.resets') == ['a@b.vn'], 'A3 gửi liên kết đặt lại mật khẩu qua dịch vụ xác thực')
    check(pg.locator('#lg-title').inner_text() == 'Đăng nhập WINDTP', 'A4 sau khi gửi quay về màn hình đăng nhập')

    to_mode(pg, 'register')
    fill_form(pg, lg_name='A', lg_email='a@b.vn', lg_pw='secret1', lg_pw2='secret1')
    submit(pg)
    check('họ và tên' in error_text(pg) and gate_visible(pg), 'A5 đăng ký với tên quá ngắn bị từ chối')
    fill_form(pg, lg_name='Nguyễn Văn A', lg_pw2='khac-nhau')
    submit(pg)
    check('xác nhận' in error_text(pg), 'A6 mật khẩu xác nhận không khớp bị từ chối')
    fill_form(pg, lg_pw2='secret1')
    submit(pg)
    check(not gate_visible(pg), 'A7 đăng ký thành công thì đóng cổng đăng nhập')
    acct = saved_account(pg)
    check(bool(acct) and acct['email'] == 'a@b.vn' and acct['name'] == 'Nguyễn Văn A' and acct['admin'] is False, 'A8 tài khoản lưu là a@b.vn, không phải admin')
    check(not any(k in (acct or {}) for k in ('pin', 'session', 'username')), 'A9 tài khoản không còn lưu mật khẩu băm hay cờ phiên cục bộ')

    reload(pg)
    check(not gate_visible(pg) and pg.evaluate('window.WindtpAuth.current().email') == 'a@b.vn', 'A10 tải lại trang vẫn giữ phiên')

    pg.evaluate('(k)=>{const s=JSON.parse(localStorage.getItem(k));s.account.admin=true;localStorage.setItem(k,JSON.stringify(s))}', STATE_KEY)
    reload(pg)
    check(pg.evaluate('window.WindtpAuth.isAdmin()') is False and saved_account(pg)['admin'] is False, 'A11 sửa cờ admin trong localStorage không cấp được quyền admin')

    other = ctx.new_page()
    other.on('pageerror', lambda e: page_errors.append(str(e)[:200]))
    other.goto(URL, wait_until='load', timeout=240000)
    settle(other)
    check(gate_visible(other) and saved_account(other) is None, 'A12 tab mới không có phiên (đăng nhập không chọn ghi nhớ) bị buộc đăng nhập lại')
    other.close()

    pg.locator('[data-action="open-settings"]').first.click()
    pg.wait_for_timeout(600)
    logout_btn = pg.locator('[data-action="logout"]').first
    logout_btn.scroll_into_view_if_needed()
    logout_btn.click()
    pg.wait_for_timeout(800)
    check(gate_visible(pg) and saved_account(pg) is None and pg.evaluate('window.WindtpAuth.current()') is None,
          'A13 nút Đăng xuất trong Cài đặt đăng xuất khỏi Firebase, xóa tài khoản và hiện cổng đăng nhập')

    to_mode(pg, 'login')
    fill_form(pg, lg_email='a@b.vn', lg_pw='sai-mat-khau')
    submit(pg)
    check(error_text(pg) == 'Sai email hoặc mật khẩu' and gate_visible(pg), 'A14 sai mật khẩu hiện lỗi và giữ cổng')
    fill_form(pg, lg_email='tên không phải email')
    submit(pg)
    check(error_text(pg) == 'Email chưa hợp lệ', 'A15 đăng nhập bằng tên tài khoản (không phải email) bị từ chối')
    fill_form(pg, lg_email='a@b.vn', lg_pw='secret1')
    pg.check('#lg-remember')
    submit(pg)
    check(not gate_visible(pg) and saved_account(pg)['email'] == 'a@b.vn', 'A16 đăng nhập đúng mật khẩu thành công')

    pg.evaluate('window.WindtpAuth.logout()')
    pg.wait_for_timeout(600)
    check(gate_visible(pg), 'A17 đăng xuất từ nơi khác (token bị thu hồi) cũng đưa về cổng đăng nhập')
    pg.click('#lg-google')
    pg.wait_for_timeout(500)
    check('Google' in error_text(pg), 'A18 đóng cửa sổ Google hiện thông báo tiếng Việt')
    pg.evaluate("window.__fakeAuth.nextGoogleEmail='g@gmail.com'")
    pg.click('#lg-google')
    pg.wait_for_timeout(600)
    check(not gate_visible(pg) and saved_account(pg)['email'] == 'g@gmail.com', 'A19 đăng nhập Google thành công')
    ctx.close()

    # --- Luồng B: quyền admin chỉ đến từ claim đã xác thực ---
    ctx = new_ctx()
    pg = open_page(ctx)
    pg.evaluate("window.__fakeAuth.seed({email:'boss@example.com',password:'bosspass1',name:'Boss',admin:true})")
    to_mode(pg, 'login')
    fill_form(pg, lg_email='boss@example.com', lg_pw='bosspass1')
    submit(pg)
    check(not gate_visible(pg) and pg.evaluate('window.WindtpAuth.isAdmin()') is True and saved_account(pg)['admin'] is True, 'B1 tài khoản có claim admin được nhận quyền admin')
    pg.evaluate("window.__fakeAuth.setAdmin('boss@example.com', false)")
    pg.wait_for_timeout(500)
    check(pg.evaluate('window.WindtpAuth.isAdmin()') is False and saved_account(pg)['admin'] is False, 'B2 thu hồi claim thì mất quyền admin ngay trong phiên')
    ctx.close()

    # --- Luồng C: giả mạo phiên admin bằng localStorage khi không có phiên thật ---
    ctx = new_ctx()
    pg = open_page(ctx)
    forged = {'version': 2, 'account': {'uid': 'x', 'email': FORGED_ADMIN_EMAIL, 'name': 'x', 'admin': True}, 'shared': {}}
    pg.evaluate('(a)=>localStorage.setItem(a[0],a[1])', [STATE_KEY, json.dumps(forged)])
    reload(pg)
    check(gate_visible(pg) and saved_account(pg) is None and pg.evaluate('window.WindtpAuth.isAdmin()') is False, 'C1 phiên admin giả trong localStorage bị loại bỏ, yêu cầu đăng nhập')
    ctx.close()
    browser.close()

check(not page_errors, 'Không có lỗi JS trên trang' + ('' if not page_errors else ': ' + '; '.join(page_errors)))
print('Thất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
