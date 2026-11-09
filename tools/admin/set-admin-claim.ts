// Cấp hoặc thu hồi quyền admin (custom claim `admin`) cho một tài khoản Firebase.
// Dùng: npm run admin:grant -- <email> [--revoke]
// Cần: GOOGLE_APPLICATION_CREDENTIALS trỏ tới file service account của dự án Firebase (không commit file này).
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const email = args.find((arg) => !arg.startsWith("--"))?.trim().toLowerCase();

if (!email) {
  console.error("Dùng: npm run admin:grant -- <email> [--revoke]");
  process.exit(2);
}

async function main(targetEmail: string): Promise<void> {
  initializeApp({ credential: applicationDefault() });
  const auth = getAuth();
  const user = await auth.getUserByEmail(targetEmail);

  // Không cấp quyền cho tài khoản chưa xác minh email: ai đó có thể đã đăng ký trước bằng email này.
  if (!revoke && !user.emailVerified) {
    throw new Error(`Email ${targetEmail} chưa được xác minh. Hãy đăng nhập vào app và bấm liên kết xác minh trong email trước khi cấp quyền.`);
  }

  const claims = { ...(user.customClaims ?? {}) };
  if (revoke) delete claims.admin;
  else claims.admin = true;
  await auth.setCustomUserClaims(user.uid, claims);

  if (revoke) {
    // Buộc mọi thiết bị lấy lại token để quyền admin mất hiệu lực ngay.
    await auth.revokeRefreshTokens(user.uid);
    console.log(`Đã thu hồi quyền admin của ${targetEmail} (uid ${user.uid}).`);
  } else {
    console.log(`Đã cấp quyền admin cho ${targetEmail} (uid ${user.uid}). Quyền có hiệu lực sau khi đăng nhập lại hoặc tối đa 1 giờ.`);
  }
}

main(email).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
