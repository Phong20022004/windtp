"""Kiểm tra kinh tế phía máy chủ trên trình duyệt thật với máy chủ ví thật (worker/ chạy trên SQLite).
Chạy: npm run build:test && python3 tests/smoke_economy.py
Chứng minh: sửa localStorage không đổi được Xu/Premium/quyền sở hữu; thưởng chỉ nhận một lần; mua hàng trừ Xu ở máy chủ;
đơn chờ duyệt chỉ admin xử lý được; người thường không gọi được API admin."""
import json, sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from support import serve_dist, serve_api, api_call, api_token

STATE_KEY = 'windtp-super-app-v2'
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


def wallet_text(pg):
    pg.evaluate('()=>{const b=document.createElement("button");b.dataset.action="goto";b.dataset.tab="wallet";document.body.appendChild(b);b.click();b.remove()}')
    pg.wait_for_timeout(400)
    return pg.locator('#tab-wallet').inner_text()


def me(token):
    status, body = api_call(API, 'GET', '/me', token, origin=ORIGIN)
    return body if status == 200 else None


with serve_dist() as URL, sync_playwright() as p:
    ORIGIN = '%s://%s' % (urlparse(URL).scheme, urlparse(URL).netloc)
    with serve_api(ORIGIN) as API:
        browser = p.chromium.launch()
        ctx_admin = browser.new_context(viewport={'width': 420, 'height': 900}, bypass_csp=True)
        ctx_user = browser.new_context(viewport={'width': 420, 'height': 900}, bypass_csp=True)

        # Admin: uid-0 (được seed đầu tiên); người dùng: uid-3 (seed 3 tài khoản đệm để uid không trùng giữa hai trình duyệt)
        adm = open_page(ctx_admin, API)
        adm.evaluate("window.__fakeAuth.seed({email:'boss@wind.vn',password:'secret1',name:'Boss',admin:true})")
        login(adm, 'boss@wind.vn', 'secret1')
        adm.wait_for_timeout(1500)
        admin_token = api_token('uid-0', 'Boss', 'boss@wind.vn', True)

        usr = open_page(ctx_user, API)
        for i in range(3):
            usr.evaluate("window.__fakeAuth.seed({email:'pad%d@x.vn',password:'secret1',name:'Pad',admin:false})" % i)
        usr.evaluate("window.__fakeAuth.seed({email:'hs@wind.vn',password:'secret1',name:'Hoc Sinh',admin:false})")
        login(usr, 'hs@wind.vn', 'secret1')
        usr.wait_for_timeout(1500)
        user_token = api_token('uid-3', 'Hoc Sinh', 'hs@wind.vn', False)

        # 1. Ví mới có số dư 0 ở máy chủ và trên giao diện
        w = me(user_token)
        check(w is not None and w['balance'] == 0, 'E1 tài khoản mới có 0 Xu ở máy chủ')
        check('1,250,000' not in wallet_text(usr), 'E2 giao diện không còn số dư mẫu 1.250.000 Xu')

        # 2. Sửa localStorage rồi tải lại: không có hiệu lực
        usr.evaluate('''(k)=>{
          const main=JSON.parse(localStorage.getItem(k));
          const ukey=k+"::u::hs@wind.vn";
          const mine=JSON.parse(localStorage.getItem(ukey)||"{}");
          Object.assign(mine,{balance:999999999,premiumUntil:4102444800000,owned:["doc-en","doc-ko"],chips:777777777,courseAccess:{en:4102444800000},history:[{id:"x",title:"Cheat",amount:999999999,kind:"in",ts:Date.now()}]});
          localStorage.setItem(ukey,JSON.stringify(mine));
          Object.assign(main,{balance:999999999,premiumUntil:4102444800000,owned:["doc-en"]});
          localStorage.setItem(k,JSON.stringify(main));
        }''', STATE_KEY)
        usr.reload(wait_until='load', timeout=240000)
        usr.wait_for_function('window.WindtpAuth.isSettled()', timeout=60000)
        usr.wait_for_timeout(1500)
        txt = wallet_text(usr)
        check('999,999,999' not in txt and '999.999.999' not in txt, 'E3 sửa balance trong localStorage không hiện ra giao diện')
        w = me(user_token)
        check(w['balance'] == 0 and w['premiumUntil'] == 0 and w['owned'] == [], 'E4 máy chủ vẫn giữ 0 Xu, không Premium, không quyền sở hữu')
        saved = usr.evaluate('(k)=>{const m=JSON.parse(localStorage.getItem(k+"::u::hs@wind.vn")||"{}");return [m.balance,m.premiumUntil,(m.owned||[]).length]}', STATE_KEY)
        check(saved[0] != 999999999 and saved[1] == 0 and saved[2] == 0, 'E5 giá trị bị sửa đã bị xóa khỏi bản lưu sau khi tải lại')

        # 3. Nhận thưởng nhiệm vụ: một lần mỗi ngày, số Xu do máy chủ định
        r1 = usr.evaluate("window.WindtpApi.client.claim('t-checkin').then(()=>'ok',e=>e.code)")
        r2 = usr.evaluate("window.WindtpApi.client.claim('t-checkin').then(()=>'ok',e=>e.code)")
        check(r1 == 'ok' and r2 == 'duplicate', 'E6 nhiệm vụ chỉ nhận được một lần trong ngày (lần 2 bị từ chối)')
        check(me(user_token)['balance'] == 200, 'E7 thưởng nhiệm vụ đúng 200 Xu do máy chủ quyết định')
        r3 = usr.evaluate("window.WindtpApi.client.claim('t-shop').then(()=>'ok',e=>e.code)")
        check(r3 != 'ok' and me(user_token)['balance'] == 200, 'E8 nhiệm vụ mua hàng không tự nhận được')

        # 4. Người thường không gọi được API admin và không tự cộng Xu
        status, _ = api_call(API, 'POST', '/admin/grant', user_token, {'email': 'hs@wind.vn', 'xu': 5000000}, ORIGIN)
        check(status == 403, 'E9 người thường gọi /admin/grant bị từ chối (403)')
        status, _ = api_call(API, 'GET', '/me', 'khong-phai-token', origin=ORIGIN)
        check(status == 401, 'E10 token không hợp lệ bị từ chối (401)')
        status, _ = api_call(API, 'GET', '/me', None, origin=ORIGIN)
        check(status == 401, 'E11 không có token bị từ chối (401)')
        status, _ = api_call(API, 'POST', '/admin/orders/1/approve', user_token, {'xu': 9e9}, ORIGIN)
        check(status == 403, 'E12 người thường không duyệt đơn được')

        # 5. Admin cộng thưởng qua giao diện theo email
        adm.evaluate('()=>{const b=document.createElement("button");b.dataset.action="open-orders";document.body.appendChild(b);b.click();b.remove()}')
        adm.wait_for_selector('#ac-email', timeout=15000)
        adm.fill('#ac-email', 'hs@wind.vn')
        adm.fill('#ac-xu', '300000')
        adm.fill('#ac-chip', '0')
        adm.click('[data-action="admin-credit"]')
        adm.wait_for_timeout(1200)
        check(me(user_token)['balance'] == 300200, 'E13 admin cộng 300.000 Xu theo email qua giao diện, máy chủ ghi nhận')

        # 6. Mua tài liệu: giá do máy chủ lấy từ bảng giá admin đã đăng, trừ Xu ở máy chủ
        before = me(user_token)['balance']
        ok = usr.evaluate("window.WindtpApi.client.purchase('doc-en').then(()=>'ok',e=>e.code)")
        w = me(user_token)
        check(ok == 'ok' and 'doc-en' in w['owned'] and w['balance'] == before - 100000, 'E14 mua tài liệu trừ đúng 100.000 Xu và cấp quyền')
        again = usr.evaluate("window.WindtpApi.client.purchase('doc-en').then(()=>'ok',e=>e.code)")
        check(again != 'ok' and me(user_token)['balance'] == before - 100000, 'E15 không bị trừ Xu hai lần cho cùng một món')
        bad = usr.evaluate("window.WindtpApi.client.purchase('item-khong-co').then(()=>'ok',e=>e.code)")
        check(bad != 'ok', 'E16 món không có trong bảng giá không mua được')

        # 7. Đổi chip: cần ngày sinh; hạn mức theo tuổi do máy chủ kiểm
        nochip = usr.evaluate("window.WindtpApi.client.exchangeChips(1000).then(()=>'ok',e=>e.code)")
        check(nochip != 'ok', 'E17 chưa khai ngày sinh thì không đổi chip được')
        usr.evaluate("window.WindtpApi.client.setBirth('1990-01-01')")
        ok = usr.evaluate("window.WindtpApi.client.exchangeChips(1000).then(()=>'ok',e=>e.code)")
        w = me(user_token)
        check(ok == 'ok' and w['chips'] == 1000 and w['balance'] == before - 100000 - 1000, 'E18 đổi 1.000 Xu sang chip trừ Xu và cộng chip ở máy chủ')
        over = usr.evaluate("window.WindtpApi.client.exchangeChips(900000000).then(()=>'ok',e=>e.code)")
        check(over != 'ok', 'E19 đổi vượt số dư/hạn mức bị từ chối')

        # 8. Đơn nạp Xu: chờ duyệt, người dùng không tự duyệt; admin duyệt trên giao diện
        bal = me(user_token)['balance']
        usr.evaluate("window.WindtpApi.client.createOrder({kind:'topup',currency:'VND',amount:50000,code:'TOPTEST1',summary:'Nạp 50.000 Xu'})")
        check(me(user_token)['balance'] == bal, 'E20 tạo đơn nạp chưa cộng Xu')
        adm.evaluate('()=>{const b=document.createElement("button");b.dataset.action="open-orders";document.body.appendChild(b);b.click();b.remove()}')
        adm.wait_for_selector('[data-action="admin-confirm"]', timeout=15000)
        card = adm.locator('#modal-root, body').first.inner_text()
        check('TOPTEST1' in card and 'hs@wind.vn' in card, 'E21 admin thấy đơn kèm email người đặt')
        adm.click('[data-action="admin-confirm"]')
        adm.wait_for_timeout(1500)
        check(me(user_token)['balance'] == bal + 50000, 'E22 admin xác nhận thì máy chủ cộng đúng 50.000 Xu')
        status, _ = api_call(API, 'POST', '/admin/orders/1/approve', admin_token, {}, ORIGIN)
        check(me(user_token)['balance'] == bal + 50000, 'E23 duyệt lại cùng một đơn không cộng thêm')

        # 9. Người dùng thấy số dư đúng sau khi làm mới ví
        usr.evaluate('window.WindtpApi.wallet.refresh()')
        usr.reload(wait_until='load', timeout=240000)
        usr.wait_for_function('window.WindtpAuth.isSettled()', timeout=60000)
        usr.wait_for_timeout(1500)
        fmt_balance = '{:,}'.format(me(user_token)['balance'])
        check(fmt_balance in wallet_text(usr), 'E24 giao diện hiển thị đúng số dư của máy chủ (%s)' % fmt_balance)

        # 10. Đăng xuất xóa số dư hiển thị
        usr.evaluate('window.WindtpAuth.logout()')
        usr.wait_for_timeout(1000)
        state = usr.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).account', STATE_KEY)
        check(state is None, 'E25 đăng xuất xóa tài khoản đang đăng nhập')

        browser.close()

check(not page_errors, 'E26 không có lỗi JS: %s' % page_errors[:3])
print('Thất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
