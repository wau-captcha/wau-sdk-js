import { type BehaviorRecorder, recordBehavior } from "./behavior-recorder.js";
import { type Challenge, type VerifyResult, WauCaptchaClient, type WauCaptchaClientOptions } from "./client.js";
import { ChallengeType, ErrorCode } from "./constants.js";
import { addStyles, createButton, createElement } from "./dom.js";
import { WauCaptchaError } from "./errors.js";
import { DEFAULT_LABELS, type WidgetLabels } from "./labels.js";
import { createSlidePuzzle } from "./slide-puzzle.js";

export interface WidgetOptions extends WauCaptchaClientOptions {
  onSuccess?: ((token: string) => void) | undefined;
  /** Called when the token of a correct answer expires unused; the widget has started over. */
  onExpire?: (() => void) | undefined;
  /** @deprecated Renamed to onExpire. */
  onExpired?: (() => void) | undefined;
  onError?: ((error: WauCaptchaError) => void) | undefined;
  /** Name of the hidden input that carries the tokenInput. Default "wau-captcha-token". */
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

/**
 * Renders a ready-made captcha into `container`: the challenge, a text box and two buttons,
 * styled like <WauCaptcha /> from @wau-captcha/react. For slide_puzzle a slider takes the place
 * of the text box and Verify, and releasing it submits the drag.
 * A correct answer puts the token into a hidden input named `inputName` (default
 * "wau-captcha-token"), so a form around the widget sends it with its other fields, and
 * calls onSuccess. When the token expires unused, the widget starts over and calls onExpire.
 */
export function renderWidget(container: HTMLElement, options: WidgetOptions): WidgetHandle {
  const client = new WauCaptchaClient(options);
  const labels: WidgetLabels = { ...DEFAULT_LABELS, ...options.labels };
  addStyles();

  const root = createElement("div", "wau-captcha");
  const panel = createElement("div", "wau-captcha__panel");
  const image = createElement("img", "wau-captcha__image");
  image.alt = labels.imageAlt;
  image.hidden = true;
  const field = createElement("label", "wau-captcha__field");
  const answerInput = createElement("input", "wau-captcha__input");
  answerInput.autocomplete = "off";
  answerInput.spellcheck = false;
  answerInput.setAttribute("autocapitalize", "off");
  field.append(labels.prompt, answerInput);
  const actions = createElement("div", "wau-captcha__actions");
  const verifyButton = createButton(labels.verify, "primary");
  const refreshButton = createButton(labels.refresh, "outline");
  actions.append(verifyButton, refreshButton);
  const statusLine = createElement("p", "wau-captcha__status");
  statusLine.setAttribute("role", "status");
  const tokenInput = createElement("input");
  tokenInput.type = "hidden";
  tokenInput.name = options.inputName ?? "wau-captcha-token";
  const slider = createSlidePuzzle(labels, (drag) =>
    void submit((current) => client.verifySlide(current.id, drag, { behavior: recorder?.snapshot() })),
  );
  panel.append(image, slider.puzzle, field, slider.track, actions, statusLine);
  root.append(panel, tokenInput);
  container.append(root);

  let challenge: Challenge | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  // How the person behaves while the current challenge is on screen; the service checks it with the answer.
  let recorder: BehaviorRecorder | undefined;

  /** Whether the slider shows instead of the text box: the type the challenge has, or before one arrived, the one asked for. */
  const sliding = () => (challenge ? challenge.piece !== undefined : client.challengeType === ChallengeType.SLIDE_PUZZLE);

  function setBusy(value: boolean) {
    busy = value;
    verifyButton.disabled = value || !challenge;
    refreshButton.disabled = value;
    answerInput.readOnly = value;
    slider.setDisabled(value || !challenge);
  }

  /** Shows `text` under the buttons; a positive tone is the solved state, which hides the challenge. */
  function showStatus(text: string, tone?: "positive" | "negative") {
    statusLine.textContent = text;
    if (tone) statusLine.dataset.tone = tone;
    else delete statusLine.dataset.tone;
    const solved = tone === "positive";
    image.hidden = solved || !challenge || sliding();
    slider.puzzle.hidden = solved || !challenge || !sliding();
    field.hidden = solved || sliding();
    slider.track.hidden = solved || !sliding();
    verifyButton.hidden = sliding();
    actions.hidden = solved;
  }

  function fail(error: unknown) {
    const captchaError = error instanceof WauCaptchaError ? error : new WauCaptchaError(ErrorCode.UNKNOWN, String(error));
    showStatus(`${labels.failed} (${captchaError.code})`, "negative");
    options.onError?.(captchaError);
  }

  async function refresh() {
    clearTimeout(expiryTimer);
    recorder?.stop();
    recorder = undefined;
    tokenInput.value = "";
    answerInput.value = "";
    setBusy(true);
    showStatus(labels.loading);
    try {
      challenge = await client.newChallenge();
      if (challenge.piece) {
        slider.show(challenge);
      } else {
        image.src = challenge.imageUrl;
        image.width = challenge.width;
        image.height = challenge.height;
      }
      showStatus("");
      recorder = recordBehavior({ root, input: challenge.piece ? null : answerInput });
    } catch (error) {
      challenge = null;
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  /** Sends the answer `send` makes for the challenge on screen: the text typed, or the drag of the slider. */
  async function submit(send: (current: Challenge) => Promise<VerifyResult>) {
    // A solved challenge is used up: verifying it again would fail and throw the token away.
    if (busy || !challenge || tokenInput.value) return;
    setBusy(true);
    showStatus(labels.checking);
    try {
      const result = await send(challenge);
      if (!result.success) {
        // A challenge can be answered once, so a wrong answer needs a new one.
        await refresh();
        showStatus(labels.wrong);
        return;
      }
      tokenInput.value = result.token;
      showStatus(labels.verified, "positive");
      expiryTimer = setTimeout(() => {
        void refresh().then(() => {
          showStatus(labels.expired);
          (options.onExpire ?? options.onExpired)?.();
        });
      }, Math.max(0, result.expiresAt.getTime() - Date.now()));
      options.onSuccess?.(result.token);
    } catch (error) {
      if (error instanceof WauCaptchaError && error.code === ErrorCode.CHALLENGE_NOT_FOUND) {
        // The challenge expired while it was on screen: show a fresh one.
        await refresh();
        showStatus(labels.expired);
        return;
      }
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  function verify() {
    const answer = answerInput.value.trim();
    if (answer) void submit((current) => client.verify(current.id, answer, { behavior: recorder?.snapshot() }));
  }

  verifyButton.addEventListener("click", () => verify());
  refreshButton.addEventListener("click", () => void refresh());
  answerInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    // Keep Enter from submitting the surrounding form before the captcha is solved.
    event.preventDefault();
    verify();
  });

  void refresh();

  return {
    refresh,
    getToken: () => tokenInput.value || null,
    destroy() {
      clearTimeout(expiryTimer);
      recorder?.stop();
      root.remove();
    },
  };
}
