import { it } from "node:test";
import assert from "node:assert/strict";
import { deviceId, sessionStore } from "../../src/api/install";

it("mã thiết bị: tạo một lần, giữ lại, thay mã hỏng, và vẫn có mã khi bị chặn lưu trữ", () => {
  const store = new Map<string, string>();
  const win = { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }, crypto: globalThis.crypto } as unknown as Window;
  const a = deviceId(win);
  assert.match(a, /^[A-Za-z0-9_-]{16,64}$/);
  assert.equal(deviceId(win), a);
  store.set("windtp-device", "bad id!");
  const b = deviceId(win);
  assert.match(b, /^[A-Za-z0-9_-]{16,64}$/);
  const blocked = { localStorage: { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } }, crypto: globalThis.crypto } as unknown as Window;
  assert.match(deviceId(blocked), /^[A-Za-z0-9_-]{16,64}$/);
});

it("khóa phiên: lưu, đọc, xóa; vẫn dùng được trong bộ nhớ khi bị chặn lưu trữ", () => {
  const store = new Map<string, string>();
  const win = { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } } as unknown as Window;
  const s = sessionStore(win);
  s.clear();
  assert.equal(s.get(), "");
  s.set("K".repeat(32));
  assert.equal(store.get("windtp-skey"), "K".repeat(32));
  assert.equal(sessionStore(win).get(), "K".repeat(32)); // tab khác của cùng trình duyệt đọc được
  s.clear();
  assert.equal(s.get(), "");
  assert.equal(store.has("windtp-skey"), false);
  const blocked = { localStorage: { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } } } as unknown as Window;
  const b = sessionStore(blocked);
  b.set("Z".repeat(32));
  assert.equal(b.get(), "Z".repeat(32));
  b.clear();
  assert.equal(b.get(), "");
});
