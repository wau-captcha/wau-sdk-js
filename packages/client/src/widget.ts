import { type Challenge, WauCaptchaClient, type WauCaptchaClientOptions } from "./client.js";
import { button, element } from "./dom.js";
import { WauCaptchaError } from "./errors.js";

export interface WidgetLabels {
  prompt: string;
  verify: string;
  refresh: string;
  loading: string;
  checking: string;
  wrong: string;
  verified: string;
  expired: string;
  failed: string;
  imageAlt: string;
}

export interface WidgetOptions extends WauCaptchaClientOptions {
  onSuccess?: ((token: string) => void) | undefined;
  onExpired?: (() => void) | undefined;
  onError?: ((error: WauCaptchaError) => void) | undefined;
  /** Name of the hidden input that carries the token. Default "wau-captcha-token". */
  inputName?: string | undefined;
  labels?: Partial<WidgetLabels> | undefined;
}

export interface WidgetHandle {
  /** Loads a new challenge. */
  refresh: () => Promise<void>;
  /** The token of a correct answer while it is valid. */
  getToken: () => string | null;
  /** Removes the widget. */
  destroy: () => void;
}

export const DEFAULT_LABELS: WidgetLabels = {
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
 */
export function renderWidget(container: HTMLElement, options: WidgetOptions): WidgetHandle {
  const client = new WauCaptchaClient(options);
  const labels: WidgetLabels = { ...DEFAULT_LABELS, ...options.labels };
  const inputName = options.inputName ?? "wau-captcha-token";

  const root = element("div", "wau-captcha", "display:inline-grid;gap:8px;font:14px/1.4 system-ui,sans-serif;max-width:320px");
  const image = element("img", "wau-captcha__image", "display:block;border-radius:6px;background:#f3f3f3");
  image.alt = labels.imageAlt;
  const inputId = `wau-captcha-${Math.random().toString(36).slice(2, 10)}`;
  const label = element("label", "wau-captcha__label");
  label.htmlFor = inputId;
  label.textContent = labels.prompt;
  const answer = element("input", "wau-captcha__input", "padding:6px 8px;border:1px solid #c7c7c7;border-radius:6px;font:inherit");
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
  const token = element("input");
  token.type = "hidden";
  token.name = inputName;
  root.append(image, label, answer, buttons, status, token);
  container.append(root);

  let challenge: Challenge | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;

  function setBusy(value: boolean) {
    busy = value;
    verifyButton.disabled = value || Boolean(token.value);
    refreshButton.disabled = value;
    answer.disabled = value || Boolean(token.value);
  }

  function fail(error: unknown) {
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
