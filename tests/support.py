"""Tiện ích chung cho các bài test trình duyệt: phục vụ thư mục dist/ qua HTTP (app tải dữ liệu bằng fetch nên không chạy được bằng file://)."""
import functools, http.server, os, threading
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
