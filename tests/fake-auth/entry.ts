import { installAuth } from "../../src/auth/install";
import { MemoryAuthBackend, type FakeAuthControl } from "./memory-backend";

declare global {
  interface Window {
    __fakeAuth: FakeAuthControl;
  }
}

const backend = new MemoryAuthBackend();
window.__fakeAuth = backend.control;
installAuth(backend);
