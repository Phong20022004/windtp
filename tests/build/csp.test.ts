import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildCsp, extractInlineHandlers, extractInlineScripts, loadGameHtml, sha256Source } from "../../tools/build/csp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("extractInlineScripts", () => {
  it("lấy script inline đúng từng byte, bỏ script src, JSON và script rỗng", () => {
    const html = '<script id="a">var x=1;</script><script src="x.js"></script><script type="application/json">{"a":1}</script><script> </script><script>\n  y()\n</script>';
    assert.deepEqual(extractInlineScripts(html), ["var x=1;", "\n  y()\n"]);
  });

  it("không đọc nhầm thẻ script nằm trong chuỗi JS (đã escape </script)", () => {
    const html = '<script id="outer">const s = "<script id=\\"inner\\">1<\\/script>";</script>';
    assert.equal(extractInlineScripts(html).length, 1);
  });
});

describe("extractInlineHandlers", () => {
  it("gom handler cả khi nằm trong chuỗi JS có escape dấu nháy", () => {
    const text = `<b onclick="__enGo()"> "<i onclick=\\"__deGo()\\">" <img onerror='this.remove()'>`;
    assert.deepEqual(extractInlineHandlers(text).sort(), ["__deGo()", "__enGo()", "this.remove()"]);
  });
});

describe("buildCsp", () => {
  it("cho phép đúng băm của script/handler và không dùng 'unsafe-inline' cho script", () => {
    const csp = buildCsp({ html: '<script>alert(1)</script><b onclick="go()">', embeddedDocs: ["<script>game()</script>"] });
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src ")) ?? "";
    assert.ok(scriptSrc.includes(sha256Source("alert(1)")));
    assert.ok(scriptSrc.includes(sha256Source("game()")), "script của tài liệu nhúng cũng được cho phép");
    assert.ok(scriptSrc.includes(sha256Source("go()")));
    assert.ok(!scriptSrc.includes("'unsafe-inline'"));
    assert.ok(!scriptSrc.includes("'unsafe-eval'"));
    assert.match(csp, /object-src 'none'/);
  });

  it("cho phép miền xác thực Firebase tùy chỉnh trong frame-src và connect-src", () => {
    const csp = buildCsp({ html: "", embeddedDocs: [], authDomain: "login.windtp.vn" });
    assert.match(csp, /frame-src [^;]*https:\/\/login\.windtp\.vn/);
    assert.match(csp, /connect-src [^;]*https:\/\/login\.windtp\.vn/);
  });

  it("script bị sửa dù một ký tự thì không còn khớp băm", () => {
    const csp = buildCsp({ html: "<script>a()</script>", embeddedDocs: [] });
    assert.ok(!csp.includes(sha256Source("a() ")));
  });
});

describe("loadGameHtml (dữ liệu thật)", () => {
  it("lấy được HTML của game kèm các script inline", () => {
    const html = loadGameHtml(ROOT);
    assert.ok(html.startsWith("<!doctype html>"));
    assert.ok(extractInlineScripts(html).length >= 5);
  });
});
