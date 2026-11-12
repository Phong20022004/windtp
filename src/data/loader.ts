import type { DailyFile, DataManifest, LangCode, VocabFile } from "./types";

type Kind = "vocab" | "daily";

/** Lỗi khi tải file dữ liệu. `status` là mã HTTP, hoặc null nếu mất mạng / file hỏng. */
export class DataLoadError extends Error {
  readonly url: string;
  readonly status: number | null;

  constructor(url: string, status: number | null, detail: string) {
    super(`Không tải được dữ liệu (${detail}): ${url}`);
    this.name = "DataLoadError";
    this.url = url;
    this.status = status;
  }
}

export interface DataLoader {
  /** Tải (hoặc lấy từ bộ nhớ) từ vựng đầy đủ của một ngôn ngữ. */
  vocab(code: LangCode): Promise<VocabFile>;
  /** Trả về từ vựng nếu đã tải xong, ngược lại null; không bao giờ kích hoạt tải. */
  vocabSync(code: LangCode): VocabFile | null;
  /** Tải (hoặc lấy từ bộ nhớ) phần bổ sung cho bài ngày của một ngôn ngữ. */
  daily(code: LangCode): Promise<DailyFile>;
  dailySync(code: LangCode): DailyFile | null;
  /** Thay bản từ vựng miễn phí bằng bản đầy đủ lấy từ máy chủ sau khi xác minh quyền học. Ném lỗi nếu sai định dạng. */
  setVocab(code: LangCode, file: unknown): void;
  /** Xóa trạng thái "vừa thất bại" để lần gọi sau thử tải lại ngay (dùng khi mạng có lại). */
  resetFailures(): void;
}

export interface LoaderOptions {
  manifest: DataManifest;
  fetchImpl: (url: string) => Promise<Response>;
  /** Địa chỉ gốc để ghép đường dẫn tương đối trong manifest. */
  baseUrl: string;
  /** Số lần thử lại sau lần đầu (mặc định 2). */
  retries?: number;
  /** Thời gian chờ trước mỗi lần thử lại, tính bằng ms (mặc định 400, 1200). */
  backoffMs?: readonly number[];
  /** Sau khi thất bại hẳn, trong khoảng này các lần gọi tiếp theo bị từ chối ngay thay vì dồn yêu cầu (mặc định 15 giây). */
  failureCooldownMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const DEFAULT_BACKOFF = [400, 1200] as const;
const DEFAULT_COOLDOWN_MS = 15_000;

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVocabFile(value: unknown): value is VocabFile {
  return isRecord(value) && Object.values(value).every(Array.isArray);
}

function isDailyFile(value: unknown): value is DailyFile {
  return isRecord(value) && Array.isArray(value.vocab) && Array.isArray(value.grammar);
}

export function createDataLoader(options: LoaderOptions): DataLoader {
  const { manifest, fetchImpl, baseUrl } = options;
  const retries = options.retries ?? DEFAULT_BACKOFF.length;
  const backoff = options.backoffMs ?? DEFAULT_BACKOFF;
  const cooldown = options.failureCooldownMs ?? DEFAULT_COOLDOWN_MS;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;

  const loaded = new Map<string, unknown>();
  const inflight = new Map<string, Promise<unknown>>();
  const failures = new Map<string, { error: DataLoadError; at: number }>();

  const urlOf = (kind: Kind, code: LangCode): string => new URL(manifest[kind][code], baseUrl).href;

  async function fetchJson(url: string): Promise<unknown> {
    let lastError = new DataLoadError(url, null, "chưa thử");
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (attempt > 0) await sleep(backoff[Math.min(attempt - 1, backoff.length - 1)] ?? 0);
      let response: Response;
      try {
        response = await fetchImpl(url);
      } catch {
        lastError = new DataLoadError(url, null, "mất kết nối");
        continue;
      }
      if (!response.ok) {
        lastError = new DataLoadError(url, response.status, `HTTP ${response.status}`);
        if (isRetryableStatus(response.status)) continue;
        throw lastError;
      }
      try {
        return (await response.json()) as unknown;
      } catch {
        // Tải dở dang hoặc file hỏng: thử lại một lần như lỗi mạng.
        lastError = new DataLoadError(url, response.status, "file không đọc được");
        continue;
      }
    }
    throw lastError;
  }

  function load<T>(kind: Kind, code: LangCode, validate: (value: unknown) => value is T): Promise<T> {
    const key = `${kind}:${code}`;
    if (loaded.has(key)) return Promise.resolve(loaded.get(key) as T);
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;

    const failed = failures.get(key);
    if (failed && now() - failed.at < cooldown) return Promise.reject(failed.error);

    const url = urlOf(kind, code);
    const task = fetchJson(url)
      .then((value) => {
        if (!validate(value)) throw new DataLoadError(url, null, "sai định dạng");
        loaded.set(key, value);
        failures.delete(key);
        return value;
      })
      .catch((error: unknown) => {
        const failure = error instanceof DataLoadError ? error : new DataLoadError(url, null, "lỗi không xác định");
        failures.set(key, { error: failure, at: now() });
        throw failure;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, task);
    return task;
  }

  return {
    vocab: (code) => load("vocab", code, isVocabFile),
    vocabSync: (code) => (loaded.get(`vocab:${code}`) as VocabFile | undefined) ?? null,
    daily: (code) => load("daily", code, isDailyFile),
    dailySync: (code) => (loaded.get(`daily:${code}`) as DailyFile | undefined) ?? null,
    setVocab: (code, file) => {
      if (!isVocabFile(file)) throw new DataLoadError(`vocab:${code}`, null, "sai định dạng");
      loaded.set(`vocab:${code}`, file);
    },
    resetFailures: () => failures.clear(),
  };
}
