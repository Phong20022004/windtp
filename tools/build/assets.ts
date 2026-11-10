import crypto from "node:crypto";

const DATA_URI = /data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)/g;
const EXTENSIONS: Readonly<Record<string, string>> = { jpeg: "jpg", png: "png", webp: "webp", gif: "gif" };

export const HASH_LENGTH = 10;

export function contentHash(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, HASH_LENGTH);
}

export interface ExtractedAsset {
  /** Đường dẫn tương đối so với thư mục chứa trang, ví dụ "assets/ab12cd34ef.jpg". */
  path: string;
  data: Buffer;
}

/**
 * Thay các ảnh base64 nhúng trong mã bằng đường dẫn tới file riêng (đặt tên theo băm nội dung).
 * Ảnh nhỏ hơn `minBytes` được giữ nguyên vì thêm một request không đáng.
 */
export function extractDataUris(source: string, minBytes: number, sink: Map<string, ExtractedAsset>): string {
  return source.replace(DATA_URI, (whole: string, kind: string, base64: string) => {
    const data = Buffer.from(base64, "base64");
    if (data.length < minBytes) return whole;
    const extension = EXTENSIONS[kind] ?? kind;
    const assetPath = `assets/${contentHash(data)}.${extension}`;
    sink.set(assetPath, { path: assetPath, data });
    return assetPath;
  });
}
