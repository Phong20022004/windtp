"""Chèn payload XSS vào mọi trường dữ liệu người dùng/quản trị và kiểm tra không có mã nào chạy.
Chạy: npm run build:test && python3 tests/smoke_xss.py"""
import json, sys, time
from playwright.sync_api import sync_playwright
from support import serve_dist

STATE_KEY = 'windtp-super-app-v2'
TABS = ['home', 'learn', 'shop', 'entertainment', 'tasks', 'utilities', 'community', 'wallet']
PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='


def P(tag):
    return '"><img src=x onerror="(window.__xss=window.__xss||{})[\'%s\']=1">' % tag


failures = []
seen = set()
ALL_TAGS = ['post.author', 'post.tag', 'post.text', 'comment.author', 'comment.text', 'listing.title', 'listing.price', 'listing.loc', 'listing.desc',
            'product.name', 'product.desc', 'cat.name', 'task.title', 'task.desc', 'userName', 'group.name', 'msg.me', 'msg.other']


def check(cond, label):
    print(('OK   ' if cond else 'FAIL ') + label)
    if not cond:
        failures.append(label)


def shared_payload():
    now = int(time.time() * 1000)
    return {
        'postsCleared': True,
        'posts': [{'id': 'po-x', 'status': 'approved', 'author': P('post.author'), 'tag': P('post.tag'), 'text': P('post.text'), 'ts': now, 'likes': 1, 'liked': False,
                   'comments': [{'id': 'c-x', 'author': P('comment.author'), 'text': P('comment.text'), 'ts': now}]}],
        'listings': [{'id': 'l-x', 'cat': 'market', 'title': P('listing.title'), 'price': P('listing.price'), 'loc': P('listing.loc'), 'country': P('listing.country'),
                      'region': P('listing.region'), 'addr': P('listing.addr'), 'sid': 'WIND-x', 'ts': now, 'desc': P('listing.desc'), 'status': 'approved'}],
        'customProducts': [{'id': 'px-x', 'custom': True, 'name': P('product.name'), 'desc': P('product.desc'), 'price': {'VND': 1000, 'KRW': 100, 'JPY': 10},
                            'cat': 'fashion', 'sub': P('product.sub'), 'emoji': '🛍', 'img': PIXEL, 'ts': now, 'rewardXu': 0, 'rewardChips': 0}],
        'customCats': [{'id': 'cc-x', 'name': P('cat.name'), 'emoji': P('cat.emoji')}],
        'customTasks': [{'id': 'ct-x', 'title': P('task.title'), 'desc': P('task.desc'), 'xu': 1, 'chips': 1, 'money': 0, 'cur': 'VND', 'ts': now}],
    }


with serve_dist() as URL, sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 420, 'height': 900})
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)[:160]))
    pg.on('dialog', lambda d: d.dismiss())
    pg.goto(URL, wait_until='load', timeout=240000)
    pg.wait_for_function('window.WindtpAuth && window.WindtpAuth.isSettled()', timeout=60000)
    pg.wait_for_timeout(500)
    if pg.locator('#login-gate [data-mode="register"]').count():
        pg.click('#login-gate [data-mode="register"]')
    pg.fill('#lg-name', 'Tên <b>x</b>')
    pg.fill('#lg-email', 'xss@b.vn')
    pg.fill('#lg-pw', 'secret1')
    pg.fill('#lg-pw2', 'secret1')
    pg.click('#lg-submit')
    pg.wait_for_timeout(600)
    # ghi dữ liệu độc hại vào kho dùng chung rồi tải lại để ứng dụng đọc nó
    pg.evaluate('''([k, shared, name, gname, m1, m2]) => {
        const s = JSON.parse(localStorage.getItem(k));
        s.shared = Object.assign(s.shared || {}, shared);
        localStorage.setItem(k, JSON.stringify(s));
        const uk = k + '::u::xss@b.vn';
        const u = JSON.parse(localStorage.getItem(uk) || '{}');
        u.userName = name; u.lang = 'en';
        u.social = { challenges: [], record: {}, pokes: {}, points: 0, groups: [{ id: 'gp-x', name: gname, members: [], ts: Date.now() }],
                     msgs: { 'grp:gp-x': [{ from: 'me', t: m1, ts: Date.now() }, { from: 'x', t: m2, ts: Date.now() }], world: [{ from: 'me', t: m1, ts: Date.now() }] } };
        localStorage.setItem(uk, JSON.stringify(u));
    }''', [STATE_KEY, shared_payload(), P('userName'), P('group.name'), P('msg.me'), P('msg.other')])
    pg.reload(wait_until='load', timeout=240000)
    pg.wait_for_function('window.WindtpAuth && window.WindtpAuth.isSettled()', timeout=60000)
    pg.wait_for_timeout(800)

    def visit(label):
        pg.wait_for_timeout(350)
        seen.update(pg.evaluate("(tags)=>tags.filter(t=>document.body.innerText.includes(\"['\"+t+\"']\"))", ALL_TAGS))
        hit = pg.evaluate('Object.keys(window.__xss||{})')
        check(not hit, '%s: không chạy mã chèn%s' % (label, '' if not hit else ' (' + ', '.join(hit) + ')'))

    visit('trang chủ')
    for tab in TABS:
        pg.evaluate("(t)=>{const b=document.querySelector('[data-action=\"goto\"][data-tab=\"'+t+'\"]');if(b)b.click()}", tab)
        visit('tab ' + tab)
    # đi sâu hơn: bấm các hành động mở màn hình/modal có hiển thị dữ liệu người dùng
    def act(action, **attrs):
        sel = '[data-action="%s"]' % action + ''.join('[data-%s="%s"]' % kv for kv in attrs.items())
        pg.evaluate("(s)=>{const e=document.querySelector(s);if(e)e.click()}", sel)
        visit('%s %s' % (action, attrs or ''))
    def tab(name):
        pg.evaluate("(t)=>document.querySelector('[data-action=\"goto\"][data-tab=\"'+t+'\"]')?.click()", name)
        pg.wait_for_timeout(250)
    tab('shop'); act('open-product'); act('add-cart'); act('open-cart')
    pg.keyboard.press('Escape')
    tab('utilities')
    for cat in ['all', 'market', 'jobs', 'housing', 'community']:
        act('util-cat', cat=cat)
    tab('community')
    for cat in ['all', 'market', 'community', 'posts']:
        act('util-cat', cat=cat)
    act('toggle-comments'); act('open-listing'); act('open-profile'); act('open-orders'); act('open-settings'); act('toggle-notices'); act('toggle-search')
    tab('tasks'); act('open-task-add')
    tab('entertainment')
    for hub in ['find', 'mine', 'groups', 'friends']:
        act('hub-tab', t=hub)
        act('open-group'); pg.keyboard.press('Escape')
        act('open-world'); pg.keyboard.press('Escape')
    for cat in ['fashion']:
        pg.evaluate("document.querySelector('[data-action=\"goto\"][data-tab=\"shop\"]')?.click()")
        pg.wait_for_timeout(300)
        visit('cửa hàng')
    print('Hiển thị (đã được escape) trên giao diện:', sorted(seen))
    print('Chưa được hiển thị trong lần duyệt này:', sorted(set(ALL_TAGS) - seen))
    # đầu vào từ URL (liên kết mời, định tuyến, mã giới thiệu) không được chạy mã
    pg.evaluate("window.__xss = {}")
    evil = '"><img src=x onerror="(window.__xss=window.__xss||{})[\'url\']=1">'
    for suffix in ['#room=ABC123&c=' + evil + '-4-100', '#room=' + evil + '&c=' + evil, '#/' + evil, '?ref=' + evil + '#room=ZZZ999&c=poker-9-9']:
        pg.goto(URL.split('#')[0].split('?')[0] + suffix, wait_until='load', timeout=240000)
        pg.wait_for_function('window.WindtpAuth && window.WindtpAuth.isSettled()', timeout=60000)
        pg.wait_for_timeout(700)
        visit('đầu vào URL ' + suffix[:18])
        pg.evaluate("document.querySelector('[data-action=\"join-room\"]')?.click()")
        visit('vào bàn từ URL')
    check(not errors, 'không có lỗi JS' + ('' if not errors else ': ' + '; '.join(errors[:3])))
    browser.close()

print('Thất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
