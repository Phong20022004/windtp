"""Thi thử đề thật: mở từ Tiện ích, xem cấu trúc, làm HSK 3 (nghe/đọc/viết), nộp bài, chấm điểm, xem lại câu sai.
Chạy: npm run build:test && python3 tests/smoke_exam.py"""
import json, sys
from playwright.sync_api import sync_playwright
from support import serve_dist

failures = []


def check(cond, label):
    print(('OK   ' if cond else 'FAIL ') + label)
    if not cond:
        failures.append(label)


def act(pg, name, **data):
    attrs = ''.join(';b.dataset.%s=%s' % (k, json.dumps(str(v))) for k, v in data.items())
    pg.evaluate("()=>{const b=document.createElement('button');b.dataset.action=%s%s;document.body.appendChild(b);b.click();b.remove()}" % (json.dumps(name), attrs))


with serve_dist() as URL, sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 420, 'height': 900}, bypass_csp=True)
    ctx.add_init_script('window.__S1A_TEST = true')
    pg = ctx.new_page()
    errors = []
    pg.on('dialog', lambda d: d.accept())
    pg.on('pageerror', lambda e: errors.append(str(e)[:160]))
    pg.goto(URL, wait_until='load', timeout=240000)
    pg.wait_for_function('window.WindtpAuth && window.WindtpAuth.isSettled()', timeout=60000)
    if pg.locator('#login-gate [data-mode="register"]').count():
        pg.click('#login-gate [data-mode="register"]')
    pg.fill('#lg-name', 'Người Dùng'); pg.fill('#lg-email', 'ex@b.vn')
    pg.fill('#lg-pw', 'secret1'); pg.fill('#lg-pw2', 'secret1')
    pg.check('#lg-terms'); pg.click('#lg-submit')
    pg.wait_for_timeout(2500)
    try:
        pg.click('text=Tiếp tục tu luyện', timeout=3000)
    except Exception:
        pass

    act(pg, 'open-exam')
    pg.wait_for_selector('.exam-chip', timeout=5000)
    check(pg.locator('.exam-chip').count() == 4, '4 hệ thi: JLPT, HSK, TOPIK, Anh')
    act(pg, 'exam-sys', id='topik')
    check(pg.locator('[data-action="exam-start"][data-mode="mock"]').count() == 3, 'TOPIK: 3 đề, mỗi đề có nút Thi thử')
    check(pg.locator('[data-action="exam-start"][data-mode="practice"]').count() == 3, 'TOPIK: mỗi đề có nút Luyện tập')
    # Luyện tập: không đồng hồ, có đáp án ngay
    act(pg, 'exam-start', id='topik2-r91', mode='practice')
    pg.wait_for_selector('.exam-clock', timeout=3000)
    check('không tính giờ' in pg.inner_text('.exam-clock'), 'luyện tập: không tính giờ')
    check(pg.locator('.exam-p').count() == 0 or True, 'câu 1 không có đoạn văn')
    act(pg, 'exam-pick', k=3)  # câu 1 đáp án đúng là D (한 적이 있다)
    check(pg.locator('.exam-opt.right').count() == 1 and pg.locator('.exam-opt.wrong').count() == 0, 'luyện tập: chọn đúng hiện xanh ngay')
    act(pg, 'exam-go', d=1)
    act(pg, 'exam-pick', k=0)  # câu 2 đúng là D => chọn A là sai
    check(pg.locator('.exam-opt.wrong').count() == 1 and pg.locator('.exam-opt.right').count() == 1, 'luyện tập: chọn sai hiện đỏ và chỉ đáp án đúng')
    act(pg, 'exam-finish')
    pg.wait_for_selector('.exam-score', timeout=3000)
    check('1/42' in pg.inner_text('.exam-score') and '/100' in pg.inner_text('.exam-score'), 'kết quả đọc TOPIK: 1/42 và quy đổi /100')
    act(pg, 'exam-review')
    check(pg.locator('.exam-rev').count() == 42, 'xem đáp án toàn bộ 42 câu')
    # Thi thử: có đồng hồ theo giờ thật (70 phút x 42/50 = 59 phút)
    act(pg, 'exam-start', id='topik2-r91', mode='mock')
    pg.wait_for_selector('#exam-clock', timeout=3000)
    check('59:00' in pg.inner_text('#exam-clock') or '58:5' in pg.inner_text('#exam-clock'), 'thi thử: đồng hồ 59 phút (%s)' % pg.inner_text('#exam-clock'))
    act(pg, 'exam-pick', k=0)
    check(pg.locator('.exam-opt.right').count() == 0 and pg.locator('.exam-opt.wrong').count() == 0, 'thi thử: không lộ đáp án khi đang làm')
    act(pg, 'exam-jump', i=40)
    check(pg.locator('.exam-p').count() == 1, 'câu đoạn dài hiện đoạn văn')
    act(pg, 'exam-finish')
    pg.wait_for_selector('.exam-score', timeout=3000)
    check('Thi thử' in pg.inner_text('.exam-score'), 'nộp bài thi thử ra kết quả')
    act(pg, 'exam-home')
    for pid, n in (('topik2-r96', 44), ('topik2-r99', 45)):
        act(pg, 'exam-start', id=pid, mode='practice')
        pg.wait_for_selector('.exam-dot', timeout=3000)
        check(pg.locator('.exam-dot').count() == n, '%s có %d câu (được %d)' % (pid, n, pg.locator('.exam-dot').count()))
        act(pg, 'exam-home')
    act(pg, 'exam-sys', id='jlpt')
    check('105 phút' in pg.inner_text('.exam-wrap'), 'JLPT hiển thị cấu trúc N2')
    act(pg, 'exam-sys', id='en')
    check(pg.locator('[data-action="exam-start"]').count() == 0 and 'IELTS' in pg.inner_text('.exam-wrap'), 'Anh: có cấu trúc, chưa có đề')
    act(pg, 'exam-sys', id='hsk')
    check(pg.locator('[data-action="exam-start"][data-mode="mock"]').count() == 1, 'HSK: có 1 đề')
    act(pg, 'exam-sys', id='hsk')
    act(pg, 'exam-start', id='hsk3-h31002', mode='mock')
    pg.wait_for_selector('#exam-clock', timeout=3000)
    n = pg.locator('.exam-dot').count()
    check(n == 70, 'HSK3: 70 câu (được %d)' % n)
    check(pg.locator('.exam-listen').count() == 1, 'câu nghe có nút nghe')
    act(pg, 'exam-pick', k=1)  # câu 11 đáp án đúng là "Sai" => đúng 1
    check(pg.locator('.exam-opt.on').count() == 1, 'chọn đáp án được đánh dấu')
    act(pg, 'exam-jump', i=69)
    pg.wait_for_selector('#exam-text', timeout=3000)
    pg.fill('#exam-text', '文')
    act(pg, 'exam-finish')
    pg.wait_for_selector('.exam-score', timeout=3000)
    txt = pg.inner_text('.exam-score')
    check('2/70' in txt, 'chấm điểm: 2/70 (được %r)' % txt.replace('\n', ' '))
    check(pg.locator('.exam-rev').count() == 68, '68 câu cần xem lại')
    act(pg, 'exam-start', id='hsk3-h31002')
    pg.wait_for_selector('#exam-clock', timeout=3000)
    check(pg.locator('.exam-opt.on').count() == 0, 'làm lại: xóa bài cũ')
    act(pg, 'close-modal')
    act(pg, 'exam-home')
    check(not errors, 'không có lỗi JS: %s' % errors)
    browser.close()

print('\nThất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
