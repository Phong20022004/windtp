import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDataLoader, DataLoadError, type DataLoader } from "../../src/data/loader";
import { parseManifest } from "../../src/data/install";
import { LANG_CODES, type DataManifest } from "../../src/data/types";

const manifest = {
  vocab: Object.fromEntries(LANG_CODES.map((code) => [code, `data/vocab.${code}.aaaa.json`])),
  daily: Object.fromEntries(LANG_CODES.map((code) => [code, `data/daily.${code}.bbbb.json`])),
} as DataManifest;

const BASE = "https://windtp.test/app/index.html";
const VOCAB_BODY = { "IELTS|0": [[1, [["large", "/lɑːrdʒ/"]]]] };
const DAILY_BODY = { vocab: [{ term: "a" }], grammar: [] };

type Step = { status: number; body?: unknown; raw?: string } | "network";

/** fetch giả chạy theo kịch bản từng lần gọi, ghi lại URL đã gọi. */
function scripted(steps: Step[]): { fetchImpl: (url: string) => Promise<Response>; urls: string[] } {
  const urls: string[] = [];
  let index = 0;
  const fetchImpl = async (url: string): Promise<Response> => {
    urls.push(url);
    const step = steps[Math.min(index, steps.length - 1)];
    index += 1;
    if (step === undefined || step === "network") throw new TypeError("Failed to fetch");
    const payload = step.raw ?? JSON.stringify(step.body ?? {});
    return new Response(payload, { status: step.status });
  };
  return { fetchImpl, urls };
}

function make(steps: Step[], extra: { now?: () => number; cooldown?: number } = {}): { loader: DataLoader; urls: string[]; sleeps: number[] } {
  const { fetchImpl, urls } = scripted(steps);
  const sleeps: number[] = [];
  const loader = createDataLoader({
    manifest,
    fetchImpl,
    baseUrl: BASE,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    now: extra.now ?? (() => 0),
    failureCooldownMs: extra.cooldown ?? 15_000,
  });
  return { loader, urls, sleeps };
}

async function failure(promise: Promise<unknown>): Promise<DataLoadError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof DataLoadError, "phải là DataLoadError");
    return error;
  }
  throw new Error("đáng lẽ phải thất bại");
}

describe("tải thành công", () => {
  it("ghép URL từ manifest theo trang, lưu lại và trả về qua accessor đồng bộ", async () => {
    const { loader, urls } = make([{ status: 200, body: VOCAB_BODY }]);
    assert.equal(loader.vocabSync("es"), null);
    assert.deepEqual(await loader.vocab("es"), VOCAB_BODY);
    assert.deepEqual(urls, ["https://windtp.test/app/data/vocab.es.aaaa.json"]);
    assert.deepEqual(loader.vocabSync("es"), VOCAB_BODY);
    assert.equal(loader.vocabSync("en"), null, "ngôn ngữ khác chưa tải");
    assert.equal(loader.dailySync("es"), null, "daily và vocab là hai kho riêng");
  });

  it("lần gọi sau lấy từ bộ nhớ, không tải lại", async () => {
    const { loader, urls } = make([{ status: 200, body: DAILY_BODY }]);
    await loader.daily("ko");
    await loader.daily("ko");
    assert.equal(urls.length, 1);
  });

  it("các lần gọi đồng thời dùng chung một yêu cầu", async () => {
    const { loader, urls } = make([{ status: 200, body: VOCAB_BODY }]);
    const [a, b] = await Promise.all([loader.vocab("ja"), loader.vocab("ja")]);
    assert.equal(a, b);
    assert.equal(urls.length, 1);
  });
});

describe("thử lại", () => {
  it("lỗi mạng thì thử lại với thời gian chờ tăng dần rồi thành công", async () => {
    const { loader, urls, sleeps } = make(["network", { status: 503 }, { status: 200, body: VOCAB_BODY }]);
    assert.deepEqual(await loader.vocab("de"), VOCAB_BODY);
    assert.equal(urls.length, 3);
    assert.deepEqual(sleeps, [400, 1200]);
  });

  it("hết số lần thử thì báo lỗi kèm URL, trạng thái và không lưu vào bộ nhớ", async () => {
    const { loader, urls } = make([{ status: 500 }]);
    const error = await failure(loader.vocab("fr"));
    assert.equal(urls.length, 3);
    assert.equal(error.status, 500);
    assert.match(error.url, /vocab\.fr\.aaaa\.json$/);
    assert.equal(loader.vocabSync("fr"), null);
  });

  it("404 không thử lại vì có thử cũng vô ích", async () => {
    const { loader, urls, sleeps } = make([{ status: 404 }]);
    const error = await failure(loader.vocab("en"));
    assert.equal(error.status, 404);
    assert.equal(urls.length, 1);
    assert.deepEqual(sleeps, []);
  });

  it("file tải dở (JSON hỏng) được thử lại như lỗi mạng", async () => {
    const { loader, urls } = make([{ status: 200, raw: '{"IELTS|0": [[1, [' }, { status: 200, body: VOCAB_BODY }]);
    assert.deepEqual(await loader.vocab("zh"), VOCAB_BODY);
    assert.equal(urls.length, 2);
  });
});

describe("kiểm tra định dạng", () => {
  it("từ chối vocab không phải đối tượng gồm các mảng", async () => {
    const { loader } = make([{ status: 200, body: [1, 2, 3] }]);
    const error = await failure(loader.vocab("en"));
    assert.match(error.message, /sai định dạng/);
  });

  it("từ chối daily thiếu vocab hoặc grammar", async () => {
    const { loader } = make([{ status: 200, body: { vocab: [] } }]);
    await failure(loader.daily("en"));
    assert.equal(loader.dailySync("en"), null);
  });
});

describe("chặn dồn yêu cầu sau khi thất bại", () => {
  it("trong thời gian chờ, gọi lại bị từ chối ngay không chạm mạng; hết thời gian thì thử lại", async () => {
    let clock = 1000;
    const { loader, urls } = make([{ status: 500 }, { status: 500 }, { status: 500 }, { status: 200, body: VOCAB_BODY }], { now: () => clock });
    await failure(loader.vocab("es"));
    assert.equal(urls.length, 3);

    clock += 5000;
    await failure(loader.vocab("es"));
    assert.equal(urls.length, 3, "còn trong thời gian chờ: không gọi mạng");

    clock += 11_000;
    assert.deepEqual(await loader.vocab("es"), VOCAB_BODY);
    assert.equal(urls.length, 4);
  });

  it("resetFailures cho phép thử lại ngay (khi mạng có lại)", async () => {
    const { loader, urls } = make([{ status: 500 }, { status: 500 }, { status: 500 }, { status: 200, body: VOCAB_BODY }]);
    await failure(loader.vocab("ko"));
    loader.resetFailures();
    assert.deepEqual(await loader.vocab("ko"), VOCAB_BODY);
    assert.equal(urls.length, 4);
  });

  it("thất bại ở một ngôn ngữ không ảnh hưởng ngôn ngữ khác", async () => {
    const { loader, urls } = make([{ status: 404 }, { status: 200, body: VOCAB_BODY }]);
    await failure(loader.vocab("de"));
    assert.deepEqual(await loader.vocab("en"), VOCAB_BODY);
    assert.equal(urls.length, 2);
  });
});

describe("parseManifest", () => {
  it("đọc manifest hợp lệ", () => {
    assert.deepEqual(parseManifest(JSON.stringify(manifest)), manifest);
  });

  it("báo rõ thiếu ngôn ngữ nào", () => {
    const broken = JSON.parse(JSON.stringify(manifest)) as { daily: Record<string, string> };
    delete broken.daily.ja;
    assert.throws(() => parseManifest(JSON.stringify(broken)), /daily\/ja/);
  });

  it("JSON hỏng thì ném lỗi", () => {
    assert.throws(() => parseManifest("{"));
  });
});

describe("setVocab", () => {
  it("thay bản miễn phí bằng bản đầy đủ và vocabSync trả về bản mới", async () => {
    const { loader } = make([{ status: 200, body: VOCAB_BODY }]);
    await loader.vocab("en");
    const full = { "IELTS|0": [[1, [["a"]]], [2, [["b"]]]], "IELTS|1": [[1, [["c"]]]] };
    loader.setVocab("en", full);
    assert.deepEqual(loader.vocabSync("en"), full);
  });

  it("từ chối dữ liệu sai định dạng và giữ bản cũ", async () => {
    const { loader } = make([{ status: 200, body: VOCAB_BODY }]);
    await loader.vocab("en");
    assert.throws(() => loader.setVocab("en", { "x": "không phải mảng" }), DataLoadError);
    assert.deepEqual(loader.vocabSync("en"), VOCAB_BODY);
  });
});
