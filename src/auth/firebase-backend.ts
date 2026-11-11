import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import { readErrorCode, toAuthFailure } from "./firebase-errors";
import type { AuthBackend, BackendUser, Persistence } from "./types";

async function toBackendUser(user: User): Promise<BackendUser> {
  let admin = false;
  try {
    admin = (await user.getIdTokenResult()).claims.admin === true;
  } catch {
    // Mất mạng khi làm mới token: giữ phiên nhưng không cấp quyền admin.
    admin = false;
  }
  return {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    emailVerified: user.emailVerified,
    admin,
  };
}

async function applyPersistence(auth: Auth, persistence: Persistence): Promise<void> {
  await setPersistence(auth, persistence === "local" ? browserLocalPersistence : browserSessionPersistence);
}

export function createFirebaseBackend(config: FirebaseOptions): AuthBackend {
  const auth = getAuth(initializeApp(config));

  return {
    subscribe(listener) {
      let sequence = 0;
      return onIdTokenChanged(auth, (user) => {
        const current = ++sequence;
        if (!user) {
          listener(null);
          return;
        }
        void toBackendUser(user).then((mapped) => {
          // Bỏ kết quả cũ nếu đã có thay đổi mới hơn trong lúc chờ đọc claim.
          if (current === sequence) listener(mapped);
        });
      });
    },

    async signUp({ email, password, name }, persistence) {
      try {
        await applyPersistence(auth, persistence);
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName: name });
        await user.getIdToken(true);
        // Email xác minh gửi theo kiểu cố gắng hết sức: lỗi gửi không được làm hỏng việc đăng ký.
        await sendEmailVerification(user).catch(() => undefined);
        return await toBackendUser(user);
      } catch (error) {
        throw toAuthFailure(error);
      }
    },

    async signIn({ email, password }, persistence) {
      try {
        await applyPersistence(auth, persistence);
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        return await toBackendUser(user);
      } catch (error) {
        throw toAuthFailure(error);
      }
    },

    async signInWithGoogle(persistence) {
      try {
        await applyPersistence(auth, persistence);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const { user } = await signInWithPopup(auth, provider);
        return await toBackendUser(user);
      } catch (error) {
        throw toAuthFailure(error);
      }
    },

    async sendPasswordReset(email) {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (error) {
        // Không tiết lộ email nào đã đăng ký: coi "không tìm thấy" như thành công.
        if (readErrorCode(error) === "auth/user-not-found") return;
        throw toAuthFailure(error);
      }
    },

    async getIdToken(forceRefresh = false) {
      return auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null;
    },

    async signOut() {
      try {
        await signOut(auth);
      } catch (error) {
        throw toAuthFailure(error);
      }
    },
  };
}
