import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentHash, extractDataUris, HASH_LENGTH, type ExtractedAsset } from "../../tools/build/assets";

const big = Buffer.alloc(4000, 7);
const small = Buffer.alloc(100, 9);
const uri = (mime: string, data: Buffer): string => `data:image/${mime};base64,${data.toString("base64")}`;

describe("extractDataUris", () => {
  it("thay ảnh lớn bằng đường dẫn theo băm nội dung và ghi lại dữ liệu gốc", () => {
    const sink = new Map<string, ExtractedAsset>();
    const out = extractDataUris(`{ img: "${uri("jpeg", big)}" }`, 2048, sink);
    const expected = `assets/${contentHash(big)}.jpg`;
    assert.equal(out, `{ img: "${expected}" }`);
    assert.equal(contentHash(big).length, HASH_LENGTH);
    assert.ok(sink.get(expected)?.data.equals(big));
  });

  it("giữ nguyên ảnh nhỏ hơn ngưỡng", () => {
    const sink = new Map<string, ExtractedAsset>();
    const source = `url(${uri("png", small)})`;
    assert.equal(extractDataUris(source, 2048, sink), source);
    assert.equal(sink.size, 0);
  });

  it("ảnh giống nhau dùng chung một file; ảnh khác nhau ra file khác", () => {
    const sink = new Map<string, ExtractedAsset>();
    const other = Buffer.alloc(4000, 8);
    const out = extractDataUris(`${uri("webp", big)} ${uri("webp", big)} ${uri("webp", other)}`, 2048, sink);
    assert.equal(sink.size, 2);
    const [a, b, c] = out.split(" ");
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.match(a ?? "", /^assets\/[0-9a-f]{10}\.webp$/);
  });

  it("chọn đuôi file theo loại ảnh và không đụng tới SVG hay data URI khác", () => {
    const sink = new Map<string, ExtractedAsset>();
    const svg = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27/%3E")';
    const font = "data:font/woff2;base64,AAAA";
    const out = extractDataUris(`${uri("png", big)} ${svg} ${font}`, 2048, sink);
    assert.match(out, /^assets\/[0-9a-f]{10}\.png /);
    assert.ok(out.includes(svg));
    assert.ok(out.includes(font));
  });

  it("nội dung ảnh giải ra đúng từng byte", () => {
    const random = Buffer.from(Array.from({ length: 5000 }, (_, i) => (i * 31 + 17) % 256));
    const sink = new Map<string, ExtractedAsset>();
    extractDataUris(uri("jpeg", random), 2048, sink);
    assert.ok([...sink.values()][0]?.data.equals(random));
  });
});
