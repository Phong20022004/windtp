import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapFirebaseErrorCode, readErrorCode, toAuthFailure } from "../../src/auth/firebase-errors";
import { AuthFailure, type AuthErrorCode } from "../../src/auth/types";

describe("mapFirebaseErrorCode", () => {
  const table: Array<[string, AuthErrorCode]> = [
    ["auth/invalid-email", "invalid-email"],
    ["auth/email-already-in-use", "email-in-use"],
    ["auth/weak-password", "weak-password"],
    ["auth/user-not-found", "invalid-credentials"],
    ["auth/wrong-password", "invalid-credentials"],
    ["auth/invalid-credential", "invalid-credentials"],
    ["auth/invalid-login-credentials", "invalid-credentials"],
    ["auth/user-disabled", "user-disabled"],
    ["auth/too-many-requests", "too-many-requests"],
    ["auth/network-request-failed", "network"],
    ["auth/popup-closed-by-user", "popup-closed"],
    ["auth/cancelled-popup-request", "popup-closed"],
    ["auth/popup-blocked", "popup-blocked"],
    ["auth/requires-recent-login", "recent-login"],
    ["auth/khong-biet", "unknown"],
    ["", "unknown"],
  ];

  for (const [firebaseCode, expected] of table) {
    it(`${firebaseCode || "(rỗng)"} -> ${expected}`, () => {
      assert.equal(mapFirebaseErrorCode(firebaseCode), expected);
    });
  }
});

describe("toAuthFailure", () => {
  it("đọc code từ đối tượng lỗi bất kỳ", () => {
    assert.equal(readErrorCode({ code: "auth/popup-blocked" }), "auth/popup-blocked");
    assert.equal(readErrorCode(new Error("x")), "");
    assert.equal(readErrorCode(null), "");
    assert.equal(readErrorCode({ code: 42 }), "");
  });

  it("giữ nguyên AuthFailure và đổi lỗi Firebase sang AuthFailure", () => {
    const original = new AuthFailure("network");
    assert.equal(toAuthFailure(original), original);
    const mapped = toAuthFailure({ code: "auth/too-many-requests" });
    assert.ok(mapped instanceof AuthFailure);
    assert.equal(mapped.code, "too-many-requests");
    assert.equal(toAuthFailure("chuỗi lạ").code, "unknown");
  });
});
