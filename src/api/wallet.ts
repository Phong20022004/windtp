import type { ApiClient } from "./client";
import type { Me } from "./types";

export type WalletListener = (me: Me | null) => void;

/**
 * Bản sao chỉ-đọc của ví do máy chủ giữ. Không bao giờ ghi vào localStorage: mất mạng thì app hiển thị
 * số liệu lần tải gần nhất trong bộ nhớ, tải lại trang là lấy lại từ máy chủ.
 */
export interface WalletStore {
  current(): Me | null;
  /** Lấy lại từ máy chủ; các lần gọi đồng thời dùng chung một yêu cầu. Lỗi thì giữ bản cũ và ném lại. */
  refresh(): Promise<Me>;
  clear(): void;
  onChange(listener: WalletListener): () => void;
}

export function createWalletStore(client: Pick<ApiClient, "me">): WalletStore {
  let me: Me | null = null;
  let inflight: Promise<Me> | null = null;
  let generation = 0;
  const listeners = new Set<WalletListener>();
  const emit = (): void => listeners.forEach((listener) => listener(me));

  return {
    current: () => me,
    refresh() {
      if (inflight) return inflight;
      const started = generation;
      const request = client
        .me()
        .then((next) => {
          // Đăng xuất (clear) trong lúc chờ thì bỏ kết quả, tránh hiện ví của người trước.
          if (started === generation) {
            me = next;
            emit();
          }
          return next;
        })
        .finally(() => {
          inflight = null;
        });
      inflight = request;
      return request;
    },
    clear() {
      generation += 1;
      me = null;
      inflight = null;
      emit();
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
