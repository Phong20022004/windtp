import { installApi } from "./install";

/** Địa chỉ máy chủ được build nhúng vào thẻ <meta name="windtp-api">. */
const meta = document.querySelector('meta[name="windtp-api"]');
installApi(meta?.getAttribute("content") ?? "");
