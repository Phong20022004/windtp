"""Tiện ích chung cho các bài test trình duyệt: phục vụ thư mục dist/ qua HTTP (app tải dữ liệu bằng fetch nên không chạy được bằng file://)."""
import base64, functools, http.server, json, os, subprocess, threading
from contextlib import contextmanager

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
TEST_PAGE = 'test.html'


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):  # im lặng, tránh ồn log CI
        pass


@contextmanager
def serve_dist():
    """Chạy máy chủ tĩnh trên cổng trống, trả về URL trang test."""
    handler = functools.partial(_Quiet, directory=DIST)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield 'http://127.0.0.1:%d/%s' % (server.server_address[1], TEST_PAGE)
    finally:
        server.shutdown()
        server.server_close()


def api_token(uid, name=None, email='', admin=False):
    """Token kiểu test mà tests/api-server.mjs chấp nhận (khớp token do fake-auth trong trình duyệt sinh ra)."""
    claims = json.dumps({'sub': uid, 'email': email, 'name': name or uid, 'admin': admin}, ensure_ascii=False)
    return 'test.' + base64.urlsafe_b64encode(claims.encode('utf-8')).decode().rstrip('=')


@contextmanager
def serve_api(origin):
    """Chạy máy chủ ví thật (worker/ trên SQLite) cho test; trả về địa chỉ gốc của API. `origin` là origin của trang test."""
    proc = subprocess.Popen(['node', os.path.join(ROOT, 'tests', 'api-server.mjs'), origin],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=ROOT)
    try:
        line = proc.stdout.readline().strip()
        if not line.startswith('PORT='):
            raise RuntimeError('máy chủ API không khởi động được: ' + proc.stderr.read()[:400])
        yield 'http://127.0.0.1:' + line[5:]
    finally:
        proc.terminate()
        proc.wait(timeout=10)


SESSION_PAGES = {}


def bind_session(token, page):
    """Gọi API trực tiếp bằng đúng khóa phiên mà trình duyệt `page` đang giữ (máy chủ chỉ chấp nhận một phiên mỗi tài khoản)."""
    SESSION_PAGES[token] = page


def api_call(base, method, path, token=None, body=None, origin=None):
    """Gọi API trực tiếp từ test (không qua trình duyệt) để kiểm tra trạng thái thật ở máy chủ."""
    import urllib.request, urllib.error
    headers = {'content-type': 'application/json', 'x-device-id': 'python-test-device-0001'}
    if token:
        headers['authorization'] = 'Bearer ' + token
        page = SESSION_PAGES.get(token)
        if page is not None:
            key = page.evaluate("()=>localStorage.getItem('windtp-skey')")
            if key:
                headers['x-session-key'] = key
    if origin:
        headers['origin'] = origin
    req = urllib.request.Request(base + path, method=method, headers=headers, data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read() or b'null')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'null')
