import { WauCaptchaClient } from "./client.js";
import { WauCaptchaError } from "./errors.js";

/**
 * @typedef {Object} WidgetLabels
 * @property {string} prompt
 * @property {string} verify
 * @property {string} refresh
 * @property {string} loading
 * @property {string} checking
 * @property {string} wrong
 * @property {string} verified
 * @property {string} expired
 * @property {string} failed
 * @property {string} imageAlt
 */

/**
 * @typedef {import("./client.js").WauCaptchaClientOptions & {
 *   onSuccess?: (token: string) => void,
 *   onExpired?: () => void,
 *   onError?: (error: WauCaptchaError) => void,
 *   inputName?: string,
 *   labels?: Partial<WidgetLabels>,
 * }} WidgetOptions
 */

/**
 * @typedef {Object} WidgetHandle
 * @property {() => Promise<void>} refresh Loads a new challenge.
 * @property {() => string | null} getToken The token of a correct answer while it is valid.
 * @property {() => void} destroy Removes the widget.
 */

/** @type {WidgetLabels} */
export const DEFAULT_LABELS = {
  prompt: "Type the characters you see",
  verify: "Verify",
  refresh: "New challenge",
  loading: "Loading…",
  checking: "Checking…",
  wrong: "That was not right. Try this one.",
  verified: "Verified",
  expired: "The check expired. Please solve a new challenge.",
  failed: "The captcha could not be loaded.",
  imageAlt: "Captcha challenge",
};

/**
 * Renders a ready-made captcha into `container`: the challenge, a text box and two buttons.
 * A correct answer puts the token into a hidden input named `inputName` (default
 * "wau-captcha-token"), so a form around the widget sends it with its other fields, and
 * calls onSuccess. When the token expires unused, the widget starts over and calls onExpired.
 *
 * @param {HTMLElement} container
 * @param {WidgetOptions} options
 * @returns {WidgetHandle}
 */
export function renderWidget(container, options) {
  const client = new WauCaptchaClient(options);
  const labels = { ...DEFAULT_LABELS, ...options.labels };
  const inputName = options.inputName ?? "wau-captcha-token";

  const root = element("div", "wau-captcha", "display:inline-grid;gap:8px;font:14px/1.4 system-ui,sans-serif;max-width:320px");
  const image = /** @type {HTMLImageElement} */ (element("img", "wau-captcha__image", "display:block;border-radius:6px;background:#f3f3f3"));
  image.alt = labels.imageAlt;
  const inputId = `wau-captcha-${Math.random().toString(36).slice(2, 10)}`;
  const label = /** @type {HTMLLabelElement} */ (element("label", "wau-captcha__label"));
  label.htmlFor = inputId;
  label.textContent = labels.prompt;
  const answer = /** @type {HTMLInputElement} */ (element("input", "wau-captcha__input", "padding:6px 8px;border:1px solid #c7c7c7;border-radius:6px;font:inherit"));
  answer.id = inputId;
  answer.autocomplete = "off";
  answer.spellcheck = false;
  answer.setAttribute("autocapitalize", "off");
  const buttons = element("div", "wau-captcha__buttons", "display:flex;gap:8px");
  const verifyButton = button(labels.verify, "wau-captcha__verify");
  const refreshButton = button(labels.refresh, "wau-captcha__refresh");
  buttons.append(verifyButton, refreshButton);
  const status = element("p", "wau-captcha__status", "margin:0;min-height:1.4em;color:#555");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const token = /** @type {HTMLInputElement} */ (element("input"));
  token.type = "hidden";
  token.name = inputName;
  root.append(image, label, answer, buttons, status, token);
  container.append(root);

  /** @type {import("./client.js").Challenge | null} */
  let challenge = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let expiryTimer;
  let busy = false;

  /** @param {boolean} value */
  function setBusy(value) {
    busy = value;
    verifyButton.disabled = value || Boolean(token.value);
    refreshButton.disabled = value;
    answer.disabled = value || Boolean(token.value);
  }

  /** @param {unknown} error */
  function fail(error) {
    const captchaError = error instanceof WauCaptchaError ? error : new WauCaptchaError("UNKNOWN", String(error));
    status.textContent = `${labels.failed} (${captchaError.code})`;
    options.onError?.(captchaError);
  }

  async function refresh() {
    clearTimeout(expiryTimer);
    token.value = "";
    answer.value = "";
    setBusy(true);
    status.textContent = labels.loading;
    try {
      challenge = await client.newChallenge();
      image.src = challenge.imageUrl;
      image.width = challenge.width;
      image.height = challenge.height;
      status.textContent = "";
    } catch (error) {
      challenge = null;
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    // A solved challenge is used up: verifying it again would fail and throw the token away.
    if (busy || !challenge || token.value || !answer.value.trim()) return;
    setBusy(true);
    status.textContent = labels.checking;
    try {
      const result = await client.verify(challenge.id, answer.value.trim());
      if (!result.success) {
        // A challenge can be answered once, so a wrong answer needs a new one.
        await refresh();
        status.textContent = labels.wrong;
        return;
      }
      token.value = result.token;
      status.textContent = labels.verified;
      expiryTimer = setTimeout(() => {
        void refresh().then(() => {
          status.textContent = labels.expired;
          options.onExpired?.();
        });
      }, Math.max(0, result.expiresAt.getTime() - Date.now()));
      options.onSuccess?.(result.token);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  verifyButton.addEventListener("click", () => void verify());
  refreshButton.addEventListener("click", () => void refresh());
  answer.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    // Keep Enter from submitting the surrounding form before the captcha is solved.
    event.preventDefault();
    void verify();
  });

  void refresh();

  return {
    refresh,
    getToken: () => token.value || null,
    destroy() {
      clearTimeout(expiryTimer);
      root.remove();
    },
  };
}

/**
 * Renders a widget into every element carrying data-wau-captcha, reading its options from
 * data attributes: data-site-key, data-base-url and optionally data-challenge-type and
 * data-input-name. Elements already rendered are skipped.
 *
 * @param {ParentNode} [scope]
 * @returns {WidgetHandle[]}
 */
export function autoRender(scope = document) {
  /** @type {WidgetHandle[]} */
  const handles = [];
  scope.querySelectorAll("[data-wau-captcha]").forEach((node) => {
    const host = /** @type {HTMLElement} */ (node);
    if (host.dataset.wauCaptchaRendered) return;
    host.dataset.wauCaptchaRendered = "true";
    handles.push(
      renderWidget(host, {
        siteKey: host.dataset.siteKey ?? "",
        baseUrl: host.dataset.baseUrl ?? "",
        challengeType: /** @type {import("./client.js").ChallengeType | undefined} */ (host.dataset.challengeType),
        inputName: host.dataset.inputName,
      }),
    );
  });
  return handles;
}

/**
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [style]
 */
function element(tag, className, style) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (style) node.style.cssText = style;
  return node;
}

/**
 * @param {string} text
 * @param {string} className
 */
function button(text, className) {
  const node = /** @type {HTMLButtonElement} */ (
    element("button", className, "padding:6px 12px;border:1px solid #c7c7c7;border-radius:6px;background:#fff;font:inherit;cursor:pointer")
  );
  node.type = "button";
  node.textContent = text;
  return node;
}
