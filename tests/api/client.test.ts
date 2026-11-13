import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApiClient } from "../../src/api/client";
import { createWalletStore } from "../../src/api/wallet";
import { ApiError, type Me } from "../../src/api/types";

const ME: Me = { uid: "u1", admin: false, balance: 500, chips: 10, premiumUntil: null, birth: null, history: [], owned: [], serverTime: 1 };

interface Seen {
  url: string;
  method: string;
  auth: string | null;
  device: string | null;
  key: string | null;
  body: string | null;
}

/** fetch giả chạy theo kịch bản; ghi lại từng yêu cầu. */
function server(steps: Array<{ status: number; body?: unknown; raw?: string; headers?: Record<string, string> } | "network">): { fetchImpl: typeof fetch; seen: Seen[] } {
  const seen: Seen[] = [];
  let index = 0;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    seen.push({ url: String(input), method: init?.method ?? "GET", auth: headers.get("authorization"), device: headers.get("x-device-id"), key: headers.get("x-session-key"), body: (init?.body as string | undefined) ?? null });
    const step = steps[Math.min(index, steps.length - 1)];
    index += 1;
    if (step === undefined || step === "network") throw new TypeError("Failed to fetch");
    return new Response(step.raw ?? JSON.stringify(step.body ?? {}), { status: step.status, headers: step.headers });
  }) as typeof fetch;
  return { fetchImpl, seen };
}

function make(steps: Parameters<typeof server>[0], token: (force: boolean) => Promise<string | null> = async () => "tok", getDeviceId?: () => string, session?: { get: () => string; set: (k: string) => void }) {
  const { fetchImpl, seen } = server(steps);
  return { client: createApiClient({ baseUrl: "https://api.windtp.test/", getToken: token, getDeviceId, session, fetchImpl }), seen };
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof ApiError, "phải là ApiError");
    return error;
  }
  throw new Error("đáng lẽ phải thất bại");
}

describe("yêu cầu", () => {
  it("gửi token Bearer, ghép địa chỉ gốc bỏ dấu / cuối và đọc /me", async () => {
    const { client, seen } = make([{ status: 200, body: ME }]);
    assert.deepEqual(await client.me(), ME);
    assert.equal(seen[0]?.url, "https://api.windtp.test/me");
    assert.equal(seen[0]?.auth, "Bearer tok");
  });

  it("gửi JSON cho POST và trả thưởng đúng như máy chủ báo", async () => {
    const { client, seen } = make([{ status: 200, body: { ok: true, xu: 200, chips: 0 } }]);
    assert.deepEqual(await client.claim("t-checkin"), { xu: 200, chips: 0 });
    assert.equal(seen[0]?.method, "POST");
    assert.equal(seen[0]?.body, '{"taskId":"t-checkin"}');
  });

  it("khi chưa có token thì báo chưa đăng nhập mà không gọi mạng", async () => {
    const { client, seen } = make([{ status: 200, body: ME }], async () => null);
    assert.equal((await failure(client.me())).code, "unauthenticated");
    assert.equal(seen.length, 0);
  });

  it("401 thì làm mới token đúng một lần rồi thử lại", async () => {
    const forced: boolean[] = [];
    const { client, seen } = make([{ status: 401, body: { error: "unauthenticated" } }, { status: 200, body: ME }], async (force) => {
      forced.push(force);
      return force ? "fresh" : "stale";
    });
    await client.me();
    assert.deepEqual(forced, [false, true]);
    assert.deepEqual(seen.map((s) => s.auth), ["Bearer stale", "Bearer fresh"]);
  });

  it("vẫn 401 sau khi làm mới thì báo hết phiên, không lặp vô hạn", async () => {
    const { client, seen } = make([{ status: 401, body: { error: "unauthenticated" } }]);
    assert.equal((await failure(client.me())).code, "unauthenticated");
    assert.equal(seen.length, 2);
  });
});

describe("chuẩn hóa lỗi", () => {
  const cases: Array<[number, string, string]> = [
    [402, "insufficient-or-limit", "insufficient-or-limit"],
    [403, "forbidden", "forbidden"],
    [403, "age-required", "age-required"],
    [404, "no-item", "not-found"],
    [409, "duplicate", "duplicate"],
    [409, "not-pending", "not-pending"],
    [409, "birth-locked", "birth-locked"],
    [429, "too-many-posts", "too-many"],
    [500, "internal", "unavailable"],
    [400, "bad-text", "bad-request"],
  ];
  for (const [status, serverCode, expected] of cases) {
    it(`${status} ${serverCode} -> ${expected}`, async () => {
      const { client } = make([{ status, body: { error: serverCode } }]);
      const error = await failure(client.purchase("x"));
      assert.equal(error.code, expected);
      assert.equal(error.serverCode, serverCode);
      assert.ok(error.message.length > 0);
    });
  }

  it("lỗi mạng", async () => {
    const { client } = make(["network"]);
    assert.equal((await failure(client.me())).code, "network");
  });

  it("phản hồi không phải JSON hoặc sai dạng bị từ chối", async () => {
    assert.equal((await failure(make([{ status: 200, raw: "<html>" }]).client.me())).code, "bad-response");
    assert.equal((await failure(make([{ status: 200, body: { balance: "nhiều" } }]).client.me())).code, "bad-response");
    assert.equal((await failure(make([{ status: 502, raw: "Bad Gateway" }]).client.me())).code, "unavailable");
  });
});

describe("admin", () => {
  it("duyệt đơn và lấy danh sách theo trạng thái", async () => {
    const { client, seen } = make([{ status: 200, body: { orders: [] } }, { status: 200, body: { ok: true } }]);
    assert.deepEqual(await client.admin.orders("approved"), []);
    await client.admin.approveOrder(7);
    assert.equal(seen[0]?.url, "https://api.windtp.test/admin/orders?status=approved");
    assert.equal(seen[1]?.url, "https://api.windtp.test/admin/orders/7/approve");
  });
});

describe("thiết bị và mã mời", () => {
  it("gửi X-Device-Id trong mọi yêu cầu khi có mã thiết bị, và không gửi khi không có", async () => {
    const a = make([{ status: 200, body: ME }], async () => "tok", () => "device-abc-1234567");
    await a.client.me();
    assert.equal(a.seen[0]?.device, "device-abc-1234567");
    const b = make([{ status: 200, body: ME }]);
    await b.client.me();
    assert.equal(b.seen[0]?.device, null);
  });

  it("vượt 2 thiết bị thì báo device-limit bằng tiếng Việt", async () => {
    const { client } = make([{ status: 403, body: { error: "device-limit" } }]);
    const error = await failure(client.me());
    assert.equal(error.code, "device-limit");
    assert.match(error.message, /2 thiết bị/);
  });

  it("bị đăng xuất vì đăng nhập ở thiết bị khác thì báo session-replaced", async () => {
    const { client } = make([{ status: 403, body: { error: "session-replaced" } }]);
    const error = await failure(client.me());
    assert.equal(error.code, "session-replaced");
    assert.match(error.message, /đăng xuất/);
  });

  const K0 = "A".repeat(32), K1 = "B".repeat(32);
  const store = (init = "") => { const box = { v: init }; return { box, get: () => box.v, set: (k: string) => { box.v = k; } }; };

  it("gửi X-Session-Key đang có và lưu khóa mới do máy chủ đổi", async () => {
    const s = store(K0);
    const { client, seen } = make([{ status: 200, body: ME, headers: { "x-session-key": K1 } }, { status: 200, body: ME }], async () => "tok", undefined, s);
    await client.me();
    assert.equal(seen[0]?.key, K0);
    assert.equal(s.box.v, K1);
    await client.me();
    assert.equal(seen[1]?.key, K1);
    const bad = store(K0);
    await make([{ status: 200, body: ME, headers: { "x-session-key": "ngan" } }], async () => "tok", undefined, bad).client.me();
    assert.equal(bad.box.v, K0); // khóa sai định dạng bị bỏ qua
  });

  it("no-session: tự đăng nhập phiên một lần rồi gửi lại, lưu khóa mới", async () => {
    const s = store();
    const { client, seen } = make([
      { status: 403, body: { error: "no-session" } },
      { status: 200, body: { ok: true, replaced: false, sessionKey: K0 } },
      { status: 200, body: ME },
    ], async () => "tok", undefined, s);
    assert.deepEqual(await client.me(), ME);
    assert.deepEqual(seen.map((x) => x.url.replace("https://api.windtp.test", "")), ["/me", "/session/claim", "/me"]);
    assert.equal(seen[2]?.key, K0);
    const loop = make([{ status: 403, body: { error: "no-session" } }, { status: 200, body: { ok: true, sessionKey: K0 } }, { status: 403, body: { error: "no-session" } }], async () => "tok", undefined, store());
    await assert.rejects(loop.client.me());
    assert.equal(loop.seen.length, 3); // chỉ thử lại đúng một lần, không lặp vô hạn
  });

  it("claimSession gọi POST /session/claim và trả replaced", async () => {
    const a = make([{ status: 200, body: { ok: true, replaced: true } }]);
    assert.deepEqual(await a.client.claimSession(), { replaced: true });
    assert.equal(a.seen[0]?.method, "POST");
    assert.equal(a.seen[0]?.url, "https://api.windtp.test/session/claim");
    const b = make([{ status: 200, body: { ok: true } }]);
    assert.deepEqual(await b.client.claimSession(), { replaced: false });
    const s = store();
    await make([{ status: 200, body: { ok: true, replaced: false, sessionKey: K1 } }], async () => "tok", undefined, s).client.claimSession();
    assert.equal(s.box.v, K1);
  });

  it("đọc mã mời của mình và đúng các lỗi khi nhập mã", async () => {
    const info = { code: "ABCD2345", reward: { xu: 10000, chips: 7000 }, invited: 2, rewarded: 1, referredBy: false, redeemUntil: 1700000000000 };
    const a = make([{ status: 200, body: info }]);
    assert.deepEqual(await a.client.referral(), info);
    assert.equal(a.seen[0]?.url, "https://api.windtp.test/referral");
    const bad = make([{ status: 200, body: { code: 5 } }]);
    assert.equal((await failure(bad.client.referral())).code, "bad-response");
    const cases: Array<[number, string, string]> = [[404, "no-code", "no-code"], [400, "self-referral", "self-referral"], [409, "already-purchased", "already-purchased"], [409, "duplicate", "duplicate"], [400, "bad-code", "bad-code"]];
    for (const [status, server, code] of cases) {
      const r = make([{ status, body: { error: server } }]);
      assert.equal((await failure(r.client.redeemReferral("ABCD2345"))).code, code);
    }
    const ok = make([{ status: 200, body: { ok: true } }]);
    await ok.client.redeemReferral("ABCD2345");
    assert.equal(ok.seen[0]?.method, "POST");
    assert.equal(ok.seen[0]?.url, "https://api.windtp.test/referral/redeem");
    assert.deepEqual(JSON.parse(ok.seen[0]?.body ?? "{}"), { code: "ABCD2345" });
  });

  it("liệt kê thiết bị trong tháng và admin làm mới", async () => {
    const list = { max: 2, month: "2026-11", devices: [{ id: "device-a-123456789", firstSeen: 1, current: true, active: true }] };
    const a = make([{ status: 200, body: list }]);
    assert.deepEqual(await a.client.devices(), list);
    const bad = make([{ status: 200, body: { max: 2, devices: [] } }]);
    assert.equal((await failure(bad.client.devices())).code, "bad-response");
    const adm = make([{ status: 200, body: { ok: true, removed: 2 } }]);
    assert.equal(await adm.client.admin.resetDevices("u1"), 2);
    assert.equal(adm.seen[0]?.url, "https://api.windtp.test/admin/devices/reset");
    const view = { max: 2, month: "2026-11", devices: [{ id: "d1", firstSeen: 1 }], active: null };
    const v = make([{ status: 200, body: view }]);
    assert.deepEqual(await v.client.admin.devices("u 1"), view);
    assert.equal(v.seen[0]?.url, "https://api.windtp.test/admin/devices/u%201");
  });
});

describe("wallet store", () => {
  it("chỉ lưu trong bộ nhớ, thông báo khi đổi và dùng chung yêu cầu đồng thời", async () => {
    let calls = 0;
    const store = createWalletStore({
      me: async () => {
        calls += 1;
        return { ...ME, balance: 500 + calls };
      },
    });
    const seen: Array<number | null> = [];
    store.onChange((me) => seen.push(me ? me.balance : null));
    const [a, b] = await Promise.all([store.refresh(), store.refresh()]);
    assert.equal(a, b);
    assert.equal(calls, 1);
    assert.equal(store.current()?.balance, 501);
    assert.deepEqual(seen, [501]);
  });

  it("lỗi thì giữ số liệu cũ", async () => {
    let fail = false;
    const store = createWalletStore({
      me: async () => {
        if (fail) throw new ApiError("network");
        return ME;
      },
    });
    await store.refresh();
    fail = true;
    await assert.rejects(store.refresh(), ApiError);
    assert.equal(store.current()?.balance, 500);
  });

  it("đăng xuất trong lúc đang tải thì bỏ kết quả, không hiện ví người trước", async () => {
    let release: (me: Me) => void = () => undefined;
    const store = createWalletStore({ me: () => new Promise<Me>((resolve) => (release = resolve)) });
    const pending = store.refresh();
    store.clear();
    release(ME);
    await pending;
    assert.equal(store.current(), null);
  });
});
