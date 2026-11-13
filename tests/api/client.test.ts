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
  body: string | null;
}

/** fetch giả chạy theo kịch bản; ghi lại từng yêu cầu. */
function server(steps: Array<{ status: number; body?: unknown; raw?: string } | "network">): { fetchImpl: typeof fetch; seen: Seen[] } {
  const seen: Seen[] = [];
  let index = 0;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    seen.push({ url: String(input), method: init?.method ?? "GET", auth: headers.get("authorization"), device: headers.get("x-device-id"), body: (init?.body as string | undefined) ?? null });
    const step = steps[Math.min(index, steps.length - 1)];
    index += 1;
    if (step === undefined || step === "network") throw new TypeError("Failed to fetch");
    return new Response(step.raw ?? JSON.stringify(step.body ?? {}), { status: step.status });
  }) as typeof fetch;
  return { fetchImpl, seen };
}

function make(steps: Parameters<typeof server>[0], token: (force: boolean) => Promise<string | null> = async () => "tok", getDeviceId?: () => string) {
  const { fetchImpl, seen } = server(steps);
  return { client: createApiClient({ baseUrl: "https://api.windtp.test/", getToken: token, getDeviceId, fetchImpl }), seen };
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

  it("đọc mã mời của mình và đúng các lỗi khi nhập mã", async () => {
    const info = { code: "ABCD2345", reward: { xu: 10000, chips: 7000 }, invited: 2, rewarded: 1, referredBy: false };
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

  it("liệt kê, gỡ thiết bị và admin mở khóa", async () => {
    const list = { max: 2, devices: [{ id: "device-a-123456789", firstSeen: 1, lastSeen: 2, current: true }] };
    const a = make([{ status: 200, body: list }]);
    assert.deepEqual(await a.client.devices(), list);
    const bad = make([{ status: 200, body: { max: "2" } }]);
    assert.equal((await failure(bad.client.devices())).code, "bad-response");
    const r = make([{ status: 200, body: { ok: true } }]);
    await r.client.removeDevice("device-b-123456789");
    assert.equal(r.seen[0]?.url, "https://api.windtp.test/devices/remove");
    assert.deepEqual(JSON.parse(r.seen[0]?.body ?? "{}"), { deviceId: "device-b-123456789" });
    const adm = make([{ status: 200, body: { ok: true, removed: 2 } }]);
    assert.equal(await adm.client.admin.resetDevices("u1"), 2);
    assert.equal(adm.seen[0]?.url, "https://api.windtp.test/admin/devices/reset");
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
