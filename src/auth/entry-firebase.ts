import type { FirebaseOptions } from "firebase/app";
import { createFirebaseBackend } from "./firebase-backend";
import { installAuth } from "./install";

/** Được tools/build/build.mjs nhúng lúc build từ WINDTP_FIREBASE_CONFIG hoặc firebase.config.json. */
declare const __FIREBASE_CONFIG__: FirebaseOptions;

installAuth(createFirebaseBackend(__FIREBASE_CONFIG__));
