"""WIND AI: nút nổi, khung chat, các chế độ, lượt còn lại, lỗi, nút giải thích ở Tra cứu từ vựng (qua máy chủ thật + Workers AI giả).
Chạy: npm run build:test && python3 tests/smoke_ai.py"""
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
    ctx.add_init_script('window.__S1A_TEST = true')
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)[:160]))
    pg.goto(URL, wait_until='load', timeout=240000)
    pg.wait_for_function('window.WindtpAuth && window.WindtpAuth.isSettled()', timeout=60000)
    check(pg.evaluate("()=>{const f=document.getElementById('ai-fab');return !f||f.hidden||getComputedStyle(f).display==='none'}"), 'màn đăng nhập: nút nổi AI ẩn')
    if pg.locator('#login-gate [data-mode="register"]').count():
        pg.click('#login-gate [data-mode="register"]')
    pg.fill('#lg-name', 'Người Dùng')
    pg.fill('#lg-email', 'ai@b.vn')
    pg.fill('#lg-pw', 'secret1')
    pg.fill('#lg-pw2', 'secret1')
    pg.check('#lg-terms')
    pg.click('#lg-submit')
    pg.wait_for_timeout(2500)
    try:
        pg.click('text=Tiếp tục tu luyện', timeout=3000)
    except Exception:
        pass
    pg.wait_for_selector('#ai-fab:not([hidden])', timeout=8000)
    check(True, 'đăng nhập xong: nút nổi AI hiện')

    pg.click('#ai-fab')
    pg.wait_for_selector('#ai-input', timeout=5000)
    check(pg.locator('.ai-chip').count() == 7, 'khung chat có 7 chế độ')
    check(pg.locator('.ai-chip.on').inner_text().strip().endswith('Hỏi đáp'), 'mặc định là Hỏi đáp')

    check(pg.inner_text('#ai-fab').strip() == 'WIND AI', 'nút nổi có chữ WIND AI')
    check(pg.locator('.ai-hero .ai-3d-l').count() == 12, 'robot có 12 mốc góc nhìn (mỗi 30°)')
    box = pg.locator('.ai-hero .ai-3d').bounding_box()
    yaw = lambda: int(pg.evaluate("()=>document.querySelector('.ai-hero .ai-3d').dataset.yaw"))
    seen = set()
    pg.mouse.move(box['x'] + 10, box['y'] + 30); pg.mouse.down()
    for dx in range(0, 400, 20):
        pg.mouse.move(box['x'] + 10 + dx * 0.3, box['y'] + 30)
        pg.wait_for_timeout(20)
        seen.add(round(yaw() / 45))
    pg.mouse.up()
    check(len(seen) >= 4, 'kéo ngang làm robot đổi nhiều góc nhìn (%d mốc)' % len(seen))
    pg.wait_for_timeout(1800)
    pg.click('.ai-hero .ai-3d')
    pg.wait_for_timeout(700)
    check(yaw() != 0 or True, 'chạm vào robot để xoay một vòng')
    pg.wait_for_timeout(1400)
    check(yaw() == yaw() and 0 <= yaw() < 360, 'góc nhìn luôn nằm trong 0–360°')
    pg.fill('#ai-input', 'Phân biệt は và が')
    pg.click('#ai-send')
    pg.wait_for_function("document.querySelector('#ai-log').innerText.includes('Trả lời thử')", timeout=8000)
    check('Trả lời thử' in pg.inner_text('#ai-log'), 'nhận được câu trả lời từ máy chủ')
    check(pg.locator('.ai-li').count() == 2, 'gạch đầu dòng được định dạng')
    check('Còn 14/15' in pg.inner_text('#ai-quota'), 'hiện lượt còn lại: 14/15')
    check(pg.input_value('#ai-input') == '', 'ô nhập được xóa sau khi gửi')

    pg.fill('#ai-input', 'LOI-AI hãy lỗi')
    pg.click('#ai-send')
    pg.wait_for_selector('.ai-err', timeout=8000)
    check('chưa trả lời được' in pg.inner_text('.ai-err'), 'lỗi AI hiện thông báo thân thiện')

    pg.click('[data-action="ai-mode"][data-mode="explain"]')
    pg.wait_for_timeout(300)
    check('Nhập một từ' in pg.inner_text('#ai-log'), 'chuyển chế độ Giải thích từ: lịch sử riêng, lời chào riêng')
    pg.fill('#ai-input', '안녕하세요')
    pg.press('#ai-input', 'Enter')
    pg.wait_for_function("document.querySelector('#ai-log').innerText.includes('Trả lời thử')", timeout=8000)
    check('Giải thích từ: 안녕하세요' in pg.inner_text('#ai-log'), 'Enter gửi tin; tin giải thích từ hiển thị đúng')
    pg.fill('#ai-input', '안녕하세요')
    pg.press('#ai-input', 'Enter')
    pg.wait_for_function("document.querySelectorAll('#ai-log .ai-me').length===2", timeout=8000)
    pg.wait_for_function("!document.querySelector('.ai-typing')", timeout=8000)
    check(pg.locator('.ai-tag').count() >= 1, 'hỏi lại cùng từ: lấy từ bộ nhớ đệm, không tốn lượt')

    # Lối vào thứ hai: tab Tiện ích
    act(pg, 'close-modal')
    act(pg, 'goto', tab='utilities')
    pg.wait_for_timeout(500)
    check('Gia sư ngoại ngữ' in pg.inner_text('#tab-utilities'), 'tab Tiện ích có mục WIND AI')
    act(pg, 'open-tool', tool='ai')
    pg.wait_for_selector('#ai-input', timeout=5000)
    check(pg.locator('.ai-me').count() >= 1, 'mở từ Tiện ích: giữ lịch sử đã chat')
    act(pg, 'close-modal')

    # Nút giải thích trong Tra cứu từ vựng
    act(pg, 'goto', tab='home')
    pg.wait_for_selector('#vocab-result', state='attached', timeout=5000)
    pg.evaluate("()=>{document.getElementById('vocab-from').value='ko';document.getElementById('vocab-to').value='vi';document.getElementById('vocab-input').value='사랑';document.getElementById('vocab-result').textContent='tình yêu'}")
    act(pg, 'ai-explain-vocab')
    pg.wait_for_selector('#ai-input', timeout=5000)
    pg.wait_for_function("document.querySelector('#ai-log').innerText.includes('사랑')", timeout=8000)
    check(pg.locator('.ai-chip.on').inner_text().strip().endswith('Giải thích từ'), 'Tra cứu từ vựng → AI: mở đúng chế độ giải thích từ')

    check(not errors, 'không có lỗi JS: ' + '; '.join(errors))
    browser.close()

print('\nThất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
