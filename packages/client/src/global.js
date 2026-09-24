// Entry of the <script> build: exposes window.WauCaptcha and renders every
// [data-wau-captcha] element once the page has loaded.
import { autoRender } from "./widget.js";

export * from "./index.js";

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => autoRender(), { once: true });
  } else {
    autoRender();
  }
}
