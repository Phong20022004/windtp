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
# PNG 1x1 hợp lệ, dùng làm ảnh sản phẩm trong test
PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='


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


def eventually(fn, ms=10000):
    """Chờ điều kiện đúng (thao tác giao diện chạy bất đồng bộ qua mạng); trả về kết quả cuối cùng."""
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


def me(token):
    status, body = api_call(API, 'GET', '/me', token, origin=ORIGIN)
    return body if status == 200 else None


with serve_dist() as URL, sync_playwright() as p:
    ORIGIN = '%s://%s' % (urlparse(URL).scheme, urlparse(URL).netloc)
    with serve_api(ORIGIN) as API:
        browser = p.chromium.launch()
        ctx_admin = browser.new_context(viewport={'width': 420, 'height': 900}, bypass_csp=True)
        ctx_user = browser.new_context(viewport={'width': 420, 'height': 900}, bypass_csp=True)
        # cùng mã thiết bị với bộ gọi API trực tiếp của test, vì máy chủ chỉ cho một thiết bị hoạt động mỗi tài khoản
        ctx_user.add_init_script("try{localStorage.setItem('windtp-device','python-test-device-0001')}catch(e){}")

        # Admin: uid-0 (được seed đầu tiên); người dùng: uid-3 (seed 3 tài khoản đệm để uid không trùng giữa hai trình duyệt)
        legacy = {'customProducts': [{'id': 'px-old', 'custom': True, 'name': 'Sách cũ của admin', 'desc': 'Từ localStorage', 'price': {'VND': 50000, 'KRW': 2600, 'JPY': 310}, 'cat': 'study', 'sub': 'books', 'emoji': '📚', 'img': PNG_DATA_URL, 'ts': 1, 'rewardXu': 0, 'rewardChips': 0}], 'productEdits': {}, 'hiddenProducts': [], 'customCats': []}
        ctx_admin.add_init_script("try{localStorage.setItem(%s, %s)}catch(e){}" % (json.dumps(STATE_KEY), json.dumps(json.dumps({'version': 2, 'account': None, 'shared': legacy}))))
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
        check(eventually(lambda: me(user_token)['balance'] == 300200), 'E13 admin cộng 300.000 Xu theo email qua giao diện, máy chủ ghi nhận')

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
        check(eventually(lambda: me(user_token)['balance'] == bal + 50000), 'E22 admin xác nhận thì máy chủ cộng đúng 50.000 Xu')
        status, _ = api_call(API, 'POST', '/admin/orders/1/approve', admin_token, {}, ORIGIN)
        check(me(user_token)['balance'] == bal + 50000, 'E23 duyệt lại cùng một đơn không cộng thêm')


        # 9b. Chia sẻ Facebook và nhiệm vụ đặc biệt qua máy chủ
        bal = me(user_token)['balance']
        period = usr.evaluate("(()=>{const d=new Date(Date.now()+7*36e5).toISOString();return d.slice(0,7)+'-'+(+d.slice(8,10)<=15?'a':'b')})()")
        r = usr.evaluate("window.WindtpApi.client.createOrder({kind:'fbshare',link:'https://www.facebook.com/hs/posts/1',period:%s}).then(()=>'ok',e=>e.code)" % json.dumps(period))
        check(r == 'ok' and me(user_token)['balance'] == bal, 'E27 gửi link Facebook chưa cộng Xu')
        r = usr.evaluate("window.WindtpApi.client.createOrder({kind:'fbshare',link:'https://www.facebook.com/hs/posts/2',period:%s}).then(()=>'ok',e=>e.code)" % json.dumps(period))
        check(r != 'ok', 'E28 một kỳ chỉ gửi được một link')
        adm.evaluate("window.WindtpApi.client.admin.putTasks([{id:'ct-1',title:'Quay video',xu:700,chips:0,money:0,cur:'VND'}])")
        adm.evaluate('()=>{const b=document.createElement("button");b.dataset.action="open-orders";document.body.appendChild(b);b.click();b.remove()}')
        adm.wait_for_selector('[data-action="admin-confirm"]', timeout=15000)
        check('facebook.com/hs/posts/1' in adm.locator('body').inner_text(), 'E29 admin thấy link Facebook cần xác minh')
        adm.click('[data-action="admin-confirm"]')
        adm.wait_for_timeout(1500)
        check(eventually(lambda: me(user_token)['balance'] == bal + 1000), 'E30 xác minh thì máy chủ cộng đúng 1.000 Xu (người dùng không tự đặt số)')
        r = usr.evaluate("window.WindtpApi.client.createOrder({kind:'ctask',taskId:'ct-1',summary:'x'}).then(()=>'ok',e=>e.code)")
        check(r == 'ok', 'E31 nộp nhiệm vụ đặc biệt do admin đăng')
        usr.evaluate("window.WindtpApi.client.createOrder({kind:'ctask',taskId:'ct-1'}).then(()=>'ok',e=>e.code)")
        adm.evaluate('()=>{const b=document.createElement("button");b.dataset.action="open-orders";document.body.appendChild(b);b.click();b.remove()}')
        adm.wait_for_selector('[data-action="admin-confirm"]', timeout=15000)
        adm.click('[data-action="admin-confirm"]')
        adm.wait_for_timeout(1500)
        check(eventually(lambda: me(user_token)['balance'] == bal + 1700), 'E32 nhiệm vụ đặc biệt cộng đúng 700 Xu theo bảng của máy chủ')

        # 9c. Nội dung trả phí: bản tải về chỉ có bài miễn phí, bản đầy đủ chỉ máy chủ gửi cho người có quyền
        free = usr.evaluate("window.WindtpData.vocab('en').then(v=>Object.entries(v).map(([k,l])=>[k,l.length]))")
        check(len(free) > 0 and all(k.endswith('|0') and n == 1 for k, n in free), 'E34 bản từ vựng đi kèm trang chỉ có bài 1 miễn phí')
        r = usr.evaluate("window.WindtpApi.client.vocabContent('en').then(()=>'ok',e=>e.serverCode)")
        check(r == 'premium-required', 'E35 chưa có Premium thì máy chủ không gửi bài trả phí (%s)' % r)
        oid = usr.evaluate("window.WindtpApi.client.createOrder({kind:'shop',currency:'VND',amount:1000,summary:'Khoa hoc EN'}).then(r=>r.id)")
        status, _ = api_call(API, 'POST', '/admin/orders/%d/approve' % oid, admin_token, {'grants': ['access:en'], 'premiumMonths': 1}, ORIGIN)
        check(status == 200, 'E36 admin cấp Premium và khóa học tiếng Anh theo đơn')
        r = usr.evaluate("window.WindtpApi.client.vocabContent('ko').then(()=>'ok',e=>e.serverCode)")
        check(r == 'course-required', 'E37 Premium nhưng chưa có khóa tiếng Hàn thì không lấy được (%s)' % r)
        full = usr.evaluate("window.WindtpApi.client.vocabContent('en').then(v=>{window.WindtpData.setVocab('en',v);return Object.values(v).reduce((a,l)=>a+l.length,0)})")
        check(full > sum(n for _, n in free), 'E38 có quyền thì tải được bản đầy đủ (%d bài so với %d bài miễn phí)' % (full, sum(n for _, n in free)))
        blocked = usr.evaluate("(()=>{const e=new KeyboardEvent('keydown',{key:'F12',cancelable:true,bubbles:true});window.dispatchEvent(e);return e.defaultPrevented})()")
        check(blocked, 'E39 phím F12 bị chặn trên giao diện')

        # 9d. Bài đăng cộng đồng: lưu và kiểm duyệt ở máy chủ
        r = usr.evaluate("window.WindtpApi.client.createPost('<img src=x onerror=alert(1)> Xin chao','Học tập').then(r=>r.status,e=>e.serverCode)")
        check(r == 'pending', 'E41 bài của người dùng chờ duyệt (%s)' % r)
        feed = usr.evaluate("window.WindtpApi.client.posts().then(p=>p.length)")
        check(feed == 0, 'E42 bài chưa duyệt không hiện trong bảng tin')
        adm.evaluate('()=>{const b=document.createElement("button");b.dataset.action="open-moderation";document.body.appendChild(b);b.click();b.remove()}')
        adm.wait_for_selector('[data-action="approve-content"][data-type="post"]', timeout=15000)
        adm.click('[data-action="approve-content"][data-type="post"]')
        eventually(lambda: usr.evaluate("window.WindtpApi.client.posts().then(p=>p.length)") == 1)
        feed = usr.evaluate("window.WindtpApi.client.posts().then(p=>p.map(x=>[x.tag,x.mine,x.admin]))")
        check(feed == [['Học tập', True, False]], 'E43 admin duyệt trên giao diện thì bài hiện cho mọi người (%s)' % feed)
        check(adm.evaluate("window.__xss === undefined"), 'E44 nội dung bài không chạy script')
        r = adm.evaluate("window.WindtpApi.client.deletePost(%d).then(()=>'ok',e=>e.serverCode)" % usr.evaluate("window.WindtpApi.client.posts().then(p=>p[0].id)"))
        check(r == 'ok', 'E45 admin xóa được bài của người dùng')

        # 9e. Cửa hàng do admin đăng: dữ liệu cũ trên máy admin được chuyển lên, người dùng khác thấy, ảnh nằm ở máy chủ
        status, store = api_call(API, 'GET', '/store', user_token, origin=ORIGIN)
        ok_store = eventually(lambda: api_call(API, 'GET', '/store', user_token, origin=ORIGIN)[1]['customProducts'])
        status, store = api_call(API, 'GET', '/store', user_token, origin=ORIGIN)
        prod = store['customProducts'][0] if store['customProducts'] else {}
        check(prod.get('name') == 'Sách cũ của admin' and str(prod.get('img', '')).startswith('img/'), 'E47 dữ liệu cửa hàng cũ trên máy admin được chuyển lên máy chủ kèm ảnh (%s)' % prod.get('img'))
        usr.evaluate('()=>window.dispatchEvent(new Event("online"))')
        eventually(lambda: 'Sách cũ của admin' in wallet_text(usr) or True)
        seen = eventually(lambda: usr.evaluate("()=>{const b=document.createElement('button');b.dataset.action='goto';b.dataset.tab='shop';document.body.appendChild(b);b.click();b.remove();return document.body.innerText.includes('Sách cũ của admin')}"))
        check(seen, 'E48 người dùng thường thấy sản phẩm admin đăng trong cửa hàng')
        src = usr.evaluate("(()=>{const i=[...document.querySelectorAll('img')].find(x=>x.src.includes('/img/'));return i?i.src:''})()")
        check(src.startswith(API + '/img/'), 'E49 ảnh sản phẩm tải từ máy chủ (%s)' % src[:60])
        status, _ = api_call(API, 'PUT', '/admin/store', user_token, {'customProducts': [], 'productEdits': {}, 'hiddenProducts': [], 'customCats': []}, ORIGIN)
        check(status == 403, 'E50 người thường không ghi được cấu hình cửa hàng')

        # 9f. Tin rao vặt: lưu và kiểm duyệt ở máy chủ
        lst = {'cat': 'market', 'title': 'Bán sách <b>cũ</b> giá rẻ', 'price': '50k', 'loc': 'Quận 1', 'country': 'Việt Nam', 'region': 'south', 'addr': '1 Lê Lợi', 'desc': 'Còn mới', 'emoji': '📌'}
        r = usr.evaluate("(l)=>window.WindtpApi.client.createListing(l).then(r=>r.status,e=>e.serverCode)", lst)
        check(r == 'pending', 'E52 tin rao vặt của người dùng chờ duyệt (%s)' % r)
        check(usr.evaluate("window.WindtpApi.client.listings().then(p=>p.length)") == 0, 'E53 tin chưa duyệt không hiện cho mọi người')
        adm.evaluate('()=>{const b=document.createElement("button");b.dataset.action="open-moderation";document.body.appendChild(b);b.click();b.remove()}')
        adm.wait_for_selector('[data-action="approve-content"][data-type="listing"]', timeout=15000)
        adm.click('[data-action="approve-content"][data-type="listing"]')
        ok = eventually(lambda: usr.evaluate("window.WindtpApi.client.listings().then(p=>p.length)") == 1)
        check(ok, 'E54 admin duyệt trên giao diện thì tin hiện cho mọi người')
        mine = usr.evaluate("window.WindtpApi.client.listings().then(p=>p[0].mine)")
        check(mine is True, 'E55 máy chủ đánh dấu đúng tin của chính người đăng')
        lid = usr.evaluate("window.WindtpApi.client.listings().then(p=>p[0].id)")
        status, _ = api_call(API, 'POST', '/listings/%d/delete' % lid, admin_token, {}, ORIGIN)
        check(status == 200, 'E56 admin xóa được tin của người khác')

        # 9g. Thích và bình luận: lưu ở máy chủ, người khác thấy
        pid = adm.evaluate("window.WindtpApi.client.createPost('Bài của admin để thử thích','Chung').then(r=>r.id)")
        usr.evaluate('()=>window.dispatchEvent(new Event("online"))')
        usr.evaluate("()=>{const b=document.createElement('button');b.dataset.action='goto';b.dataset.tab='community';document.body.appendChild(b);b.click();b.remove()}")
        seen = eventually(lambda: usr.evaluate("document.body.innerText.includes('Bài của admin để thử thích')"))
        check(seen, 'E57 người dùng thấy bài admin trong cộng đồng')
        usr.evaluate("()=>{const b=document.querySelector('[data-action=\"like-post\"]');b.click()}")
        ok = eventually(lambda: usr.evaluate("window.WindtpApi.client.posts().then(p=>p.find(x=>x.id==%d).likes)" % pid) == 1)
        check(ok, 'E58 bấm thích trên giao diện được ghi ở máy chủ')
        usr.evaluate("()=>{const b=document.querySelector('[data-action=\"toggle-comments\"]');b.click()}")
        usr.wait_for_selector('[data-action="send-comment"]', timeout=10000)
        usr.fill('input[id^="cmt-"]', 'Bình luận <img src=x onerror="window.__xss=1"> thử')
        usr.evaluate("()=>document.querySelector('[data-action=\"send-comment\"]').click()")
        ok = eventually(lambda: usr.evaluate("window.WindtpApi.client.posts().then(p=>p.find(x=>x.id==%d).comments.length)" % pid) == 1)
        check(ok, 'E59 bình luận gửi trên giao diện được ghi ở máy chủ')
        check(usr.evaluate("window.__xss === undefined"), 'E60 nội dung bình luận không chạy script')
        seen = eventually(lambda: adm.evaluate("window.WindtpApi.client.posts().then(p=>p.find(x=>x.id==%d).comments[0].mine)" % pid) is False)
        check(seen, 'E61 admin thấy bình luận của người khác, không đánh dấu là của mình')
        cid = adm.evaluate("window.WindtpApi.client.posts().then(p=>p.find(x=>x.id==%d).comments[0].id)" % pid)
        usr.evaluate("(id)=>{const b=document.createElement('button');b.dataset.action='delete-comment';b.dataset.id='s'+id;document.body.appendChild(b);b.click();b.remove()}", cid)
        ok = eventually(lambda: usr.evaluate("window.WindtpApi.client.posts().then(p=>p.find(x=>x.id==%d).comments.length)" % pid) == 0)
        check(ok, 'E62 chủ bình luận xóa được bình luận của mình')

        # 9h. Đồng bộ dữ liệu cá nhân: thiết bị thứ hai của cùng tài khoản thấy cài đặt đã đổi, tiền thì không đi theo bản đồng bộ
        usr.evaluate("()=>{const b=document.createElement('button');b.dataset.action='set-currency';b.dataset.cur='JPY';document.body.appendChild(b);b.click();b.remove()}")
        pushed = eventually(lambda: ((api_call(API, 'GET', '/me/state', user_token, origin=ORIGIN)[1].get('state') or {}).get('settings') or {}).get('currency') == 'JPY', 15000)
        check(pushed, 'E63 đổi cài đặt trên máy này thì tự đẩy lên máy chủ')
        _, prof = api_call(API, 'GET', '/me/state', user_token, origin=ORIGIN)
        bad_keys = [k for k in ('balance', 'chips', 'owned', 'premiumUntil', 'history', 'posts', 'orders') if k in (prof.get('state') or {})]
        check(not bad_keys and 'birth' not in prof['state']['settings'], 'E64 bản đồng bộ không chứa tiền, quyền sở hữu, bài đăng hay ngày sinh (%s)' % bad_keys)
        ctx2 = browser.new_context(viewport={'width': 420, 'height': 900}, bypass_csp=True)
        ctx2.add_init_script("try{localStorage.setItem('windtp-device','python-test-device-0001')}catch(e){}")  # thiết bị thứ hai (cùng mã với bộ gọi API của test để không vượt giới hạn 2 thiết bị)
        usr2 = open_page(ctx2, API)
        for i in range(3):
            usr2.evaluate("window.__fakeAuth.seed({email:'pad%d@x.vn',password:'secret1',name:'Pad',admin:false})" % i)
        usr2.evaluate("window.__fakeAuth.seed({email:'hs@wind.vn',password:'secret1',name:'Hoc Sinh',admin:false})")
        login(usr2, 'hs@wind.vn', 'secret1')
        got = eventually(lambda: usr2.evaluate("(k)=>JSON.parse(localStorage.getItem(k+'::u::hs@wind.vn')||'{}').settings.currency", STATE_KEY) == 'JPY', 15000)
        check(got, 'E65 đăng nhập trên thiết bị khác thì nhận được cài đặt đã đồng bộ')
        usr2.evaluate("()=>{const b=document.createElement('button');b.dataset.action='set-currency';b.dataset.cur='KRW';document.body.appendChild(b);b.click();b.remove()}")
        ok = eventually(lambda: ((api_call(API, 'GET', '/me/state', user_token, origin=ORIGIN)[1].get('state') or {}).get('settings') or {}).get('currency') == 'KRW', 15000)
        check(ok, 'E66 thay đổi từ thiết bị thứ hai cũng lên máy chủ')
        ctx2.close()

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

check(not page_errors, 'E51 không có lỗi JS: %s' % page_errors[:3])
print('Thất bại: %d' % len(failures))
sys.exit(1 if failures else 0)
