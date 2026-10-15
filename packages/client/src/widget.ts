import { createAnimalJump } from "./animal-jump.js";
import { probeBrowser } from "./auto-check.js";
import { createAutoCheckBox } from "./auto-check-box.js";
import { type BehaviorRecorder, recordBehavior } from "./behavior-recorder.js";
import { type Challenge, type VerifyResult, WauCaptchaClient, type WauCaptchaClientOptions } from "./client.js";
import { Appearance, ChallengeType, ErrorCode } from "./constants.js";
import { addStyles, createButton, createElement } from "./dom.js";
import { WauCaptchaError } from "./errors.js";
import { DEFAULT_LABELS, rateLimitedText, type WidgetLabels } from "./labels.js";
import { createObjectRotate } from "./object-rotate.js";
import { createSlidePuzzle } from "./slide-puzzle.js";

export interface WidgetOptions extends WauCaptchaClientOptions {
  onSuccess?: ((token: string) => void) | undefined;
  /**
   * Called when the token of a correct answer expires unused; the widget has started over, or for
   * auto_check waits to check again on the visitor's next action in the page.
   */
  onExpire?: (() => void) | undefined;
  /** @deprecated Renamed to onExpire. */
  onExpired?: (() => void) | undefined;
  onError?: ((error: WauCaptchaError) => void) | undefined;
  /** Name of the hidden input that carries the tokenInput. Default "wau-captcha-token". */
  inputName?: string | undefined;
  labels?: Partial<WidgetLabels> | undefined;
  /**
   * auto_check only: the type to show when the check does not let the visitor through; the service
   * may pick another the key allows. Default ChallengeType.SLIDE_PUZZLE; ChallengeType.IMAGE_DISTORT
   * where keyboard-only visitors matter.
   */
  fallbackChallengeType?: ChallengeType | undefined;
  /**
   * auto_check only: Appearance.ALWAYS (default) shows the box from the start;
   * Appearance.INTERACTION_ONLY keeps the widget hidden while it checks and once it passed, and
   * shows it only for the fallback challenge or an error.
   */
  appearance?: Appearance | undefined;
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
 * auto_check answers no sooner than this after its challenge arrived, which also lets the
 * behaviour of the visitor show: the service judges an answer recorded over less than 1 s automated.
 */
const AUTO_CHECK_MIN_MS = 1500;
/** The visitor's actions in the page that start auto_check again once its token expired. */
const WAKE_EVENTS = ["pointerdown", "keydown", "focus"] as const;

/**
 * Renders a ready-made captcha into `container`: the challenge, a text box and two buttons,
 * styled like <WauCaptcha /> from @wau-captcha/react. For slide_puzzle a slider takes the place
 * of the text box and Verify, and releasing it submits the drag. For animal_jump the two rounds
 * play one after the other with a Replay button, and the click on the second submits both clicks.
 * For object_rotate the two rounds follow one another with Rotate left, Rotate right and Done
 * (or the arrow keys and Enter on the image), and Done on the second submits both rounds. For
 * auto_check a compact box checks the visitor once it comes into view; when the check does not
 * let them through, a challenge of its fallback type takes its place, and every challenge after it
 * is of that type until the visitor passes.
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
  const auto = createAutoCheckBox(labels);
  auto.box.hidden = true;
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
  const jump = createAnimalJump(labels, (clicks) =>
    void submit((current) => client.verifyJump(current.id, clicks, { behavior: recorder?.snapshot() })),
  );
  const rotate = createObjectRotate(labels, (rounds) =>
    void submit((current) => client.verifyRotate(current.id, rounds, { behavior: recorder?.snapshot() })),
  );
  const parts = [image, slider.puzzle, jump.stage, rotate.task, rotate.stage, field, slider.track, jump.bar, rotate.bar, actions];
  panel.append(auto.box, ...parts, statusLine);
  root.append(panel, tokenInput);
  container.append(root);

  let challenge: Challenge | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  // How the person behaves while the current challenge is on screen; the service checks it with the answer.
  let recorder: BehaviorRecorder | undefined;
  // The type loaded next: the one asked for, or once auto_check fell back, its fallback until the visitor passes.
  let wanted: ChallengeType = client.challengeType;
  // Counts the runs of auto_check, so that one overtaken by another, or by destroy, stops.
  let runs = 0;
  // Stops waiting for the box to come into view, or for the visitor's next action.
  let stopWaiting = () => {};
  const interactionOnly = options.appearance === Appearance.INTERACTION_ONLY;

  /** Whether the slider, the jumping animals or the object to turn show instead of the text box: the type the challenge has, or before one arrived, the one asked for. */
  const sliding = () => (challenge ? challenge.piece !== undefined : wanted === ChallengeType.SLIDE_PUZZLE);
  const rotating = () => (challenge ? challenge.frameCount !== undefined : wanted === ChallengeType.OBJECT_ROTATE);
  const jumping = () => (challenge ? challenge.secondImage !== undefined && !rotating() : wanted === ChallengeType.ANIMAL_JUMP);

  function setBusy(value: boolean) {
    busy = value;
    verifyButton.disabled = value || !challenge;
    refreshButton.disabled = value;
    answerInput.readOnly = value;
    slider.setDisabled(value || !challenge);
    jump.setDisabled(value || !challenge);
    rotate.setDisabled(value || !challenge);
  }

  /** Shows `text` under the buttons; a positive tone is the solved state, which hides the challenge. */
  function showStatus(text: string, tone?: "positive" | "negative") {
    statusLine.textContent = text;
    if (tone) statusLine.dataset.tone = tone;
    else delete statusLine.dataset.tone;
    const solved = tone === "positive";
    // auto_check has nothing to solve: once it failed, only New challenge shows, which runs it again.
    const typing = wanted !== ChallengeType.AUTO_CHECK && !sliding() && !jumping() && !rotating();
    image.hidden = solved || !challenge || !typing;
    slider.puzzle.hidden = solved || !challenge || !sliding();
    jump.stage.hidden = solved || !challenge || !jumping();
    rotate.task.hidden = solved || !rotating();
    rotate.stage.hidden = solved || !challenge || !rotating();
    field.hidden = solved || !typing;
    slider.track.hidden = solved || !sliding();
    jump.bar.hidden = solved || !jumping();
    rotate.bar.hidden = solved || !rotating();
    verifyButton.hidden = !typing;
    actions.hidden = solved;
    auto.box.hidden = true;
    panel.hidden = false;
  }

  /** The box of auto_check, checking or passed, in place of everything else; nothing at all with interaction-only. */
  function showAuto(passed: boolean) {
    statusLine.textContent = "";
    delete statusLine.dataset.tone;
    for (const part of parts) part.hidden = true;
    auto.show(passed);
    auto.box.hidden = false;
    panel.hidden = interactionOnly;
  }

  function fail(error: unknown) {
    const captchaError = error instanceof WauCaptchaError ? error : new WauCaptchaError(ErrorCode.UNKNOWN, String(error));
    const text =
      captchaError.code === ErrorCode.RATE_LIMITED ? rateLimitedText(labels, captchaError.retryAfter) : `${labels.failed} (${captchaError.code})`;
    showStatus(text, "negative");
    options.onError?.(captchaError);
  }

  /** Forgets the challenge on screen, the behaviour recorded for it and its token. */
  function forget() {
    stopWaiting();
    clearTimeout(expiryTimer);
    recorder?.stop();
    recorder = undefined;
    tokenInput.value = "";
    challenge = null;
  }

  async function refresh() {
    if (wanted === ChallengeType.AUTO_CHECK) return check();
    clearTimeout(expiryTimer);
    recorder?.stop();
    recorder = undefined;
    tokenInput.value = "";
    answerInput.value = "";
    setBusy(true);
    showStatus(labels.loading);
    try {
      challenge = await client.newChallenge({ challengeType: wanted });
      if (challenge.piece) {
        slider.show(challenge);
      } else if (challenge.frameCount) {
        rotate.show(challenge);
      } else if (challenge.secondImage) {
        jump.show(challenge);
      } else {
        image.src = challenge.imageUrl;
        image.width = challenge.width;
        image.height = challenge.height;
      }
      showStatus("");
      // object_rotate is turned with the arrow keys too: its key presses are timed on the whole widget.
      const keys = challenge.frameCount ? root : challenge.piece || challenge.secondImage ? null : answerInput;
      recorder = recordBehavior({ root, input: keys });
    } catch (error) {
      challenge = null;
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Runs auto_check: fetches its challenge, records the behaviour on the whole page and probes the
   * browser while the proof of work is found, and sends what it found once both are done.
   */
  async function check() {
    const run = ++runs;
    forget();
    showAuto(false);
    try {
      const fetched = await client.newChallenge({
        challengeType: ChallengeType.AUTO_CHECK,
        fallbackType: options.fallbackChallengeType ?? ChallengeType.SLIDE_PUZZLE,
      });
      if (run !== runs) return;
      challenge = fetched;
      const behavior = recordBehavior({ root, page: true });
      recorder = behavior;
      // Counted from the challenge, not from when the box came into view: a slow connection must not
      // leave the time recorded under what the service accepts.
      const [probe] = await Promise.all([probeBrowser(), client.workDone(fetched.id), delay(AUTO_CHECK_MIN_MS)]);
      if (run !== runs) return;
      const result = await client.verifyAuto(fetched.id, { ...probe, pointer: behavior.pointerSummary() }, { behavior: behavior.snapshot() });
      if (run !== runs) return;
      behavior.stop();
      recorder = undefined;
      if (result.success) return pass(result);
      await fallBack(fetched.fallbackType);
    } catch (error) {
      if (run !== runs) return;
      forget();
      // The challenge expired during the check, as in a tab put to sleep: check again on the next action.
      if (error instanceof WauCaptchaError && error.code === ErrorCode.CHALLENGE_NOT_FOUND) return sleep();
      fail(error);
    }
  }

  /**
   * auto_check did not let the visitor through: a challenge of the fallback type takes its place,
   * and every challenge after it is of that type until the visitor passes. The visitor is not told why.
   */
  async function fallBack(type: ChallengeType | "" | undefined) {
    if (!type || type === ChallengeType.AUTO_CHECK) {
      return fail(new WauCaptchaError(ErrorCode.CHALLENGE_TYPE_NOT_ALLOWED, "the site key allows no challenge type for auto_check to fall back to"));
    }
    wanted = type;
    await refresh();
    // Unless the fallback could not be loaded, which refresh has shown already.
    if (challenge) showStatus(labels.autoFallback);
  }

  /** The box of auto_check at rest: it checks again on the visitor's next action in the page, never by itself. */
  function sleep() {
    forget();
    showAuto(false);
    stopWaiting = onNextAction(() => void check());
  }

  /** Puts the token of a correct answer in the form and calls onSuccess; when it expires unused, starts over. */
  function pass(result: { token: string; expiresAt: Date }) {
    tokenInput.value = result.token;
    if (wanted === ChallengeType.AUTO_CHECK) showAuto(true);
    else showStatus(labels.verified, "positive");
    expiryTimer = setTimeout(expire, Math.max(0, result.expiresAt.getTime() - Date.now()));
    options.onSuccess?.(result.token);
  }

  function expire() {
    const onExpire = options.onExpire ?? options.onExpired;
    if (client.challengeType !== ChallengeType.AUTO_CHECK) {
      void refresh().then(() => {
        showStatus(labels.expired);
        onExpire?.();
      });
      return;
    }
    // Every pass counts against the daily quota of the key: an idle tab must not pass again and
    // again by itself. The fallback, too, ends with the token.
    wanted = ChallengeType.AUTO_CHECK;
    sleep();
    onExpire?.();
  }

  /** Sends the answer `send` makes for the challenge on screen: the text typed, the drag of the slider, the clicks or the presses of the rounds. */
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
      pass(result);
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

  if (wanted === ChallengeType.AUTO_CHECK) {
    // Fetched only once the visitor can see it: a widget never seen costs the key nothing.
    showAuto(false);
    stopWaiting = whenInView(root, () => void check());
  } else {
    void refresh();
  }

  return {
    refresh,
    getToken: () => tokenInput.value || null,
    destroy() {
      runs++;
      forget();
      jump.stop();
      rotate.stop();
      root.remove();
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls `start` once `element` is at least partly in view, or at once where IntersectionObserver
 * is missing; returns what stops waiting. An element without height, as with interaction-only,
 * counts as in view where it sits.
 */
function whenInView(element: Element, start: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") {
    start();
    return () => {};
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    start();
  });
  observer.observe(element);
  return () => observer.disconnect();
}

/** Calls `start` on the visitor's next press, key or focus in the page, not one a script made up; returns what stops waiting. */
function onNextAction(start: () => void): () => void {
  const wake = (event: Event) => {
    if (!event.isTrusted) return;
    stop();
    start();
  };
  // Capturing on window sees the focus of every element too, which does not bubble, and the window's own.
  const stop = () => {
    for (const type of WAKE_EVENTS) window.removeEventListener(type, wake, true);
  };
  for (const type of WAKE_EVENTS) window.addEventListener(type, wake, true);
  return stop;
}
