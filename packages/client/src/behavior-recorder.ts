import type { Behavior, PointerSummary } from "./types.js";

// What the service reads: a move every 16 ms at most, the latest 200 samples, 64 key intervals.
// The latest samples, not an even thinning of a long session, keep the strokes of the pointer
// whole: the service judges each stroke.
const MIN_MOVE_INTERVAL_MS = 16;
const MAX_POINTER = 200;
const MAX_KEY_INTERVALS = 64;
/** The gaps between mouse moves the pointer summary tells apart, in whole ms; longer ones are pauses. */
const MAX_GAP_MS = 255;

/** Events on the widget that a script could dispatch instead of the person. */
const CHECKED_EVENTS = ["pointerdown", "pointerup", "click", "keydown", "keyup", "input", "paste", "change"] as const;

export interface BehaviorRecorderOptions {
  /** The widget: positions are measured from its top-left corner, and events on it are checked. */
  root: HTMLElement;
  /**
   * Where key presses are timed: the answer box of a text challenge, the widget for object_rotate,
   * which is turned with the arrow keys; none for slide_puzzle and animal_jump.
   */
  input?: HTMLElement | null | undefined;
  /**
   * Also records where the pointer goes down anywhere on the page, not only on the widget, still
   * measured from the widget: for auto_check, where the visitor never touches the widget. Moves
   * are recorded anywhere either way. It also counts how the mouse moves were produced, for
   * pointerSummary.
   */
  page?: boolean | undefined;
}

export interface BehaviorRecorder {
  /** What was recorded since the challenge was shown, to send with its answer now. */
  snapshot: () => Behavior;
  /**
   * With `page: true`, how the mouse moves were produced since the challenge was shown, for
   * verifyAuto; no moves otherwise.
   */
  pointerSummary: () => PointerSummary;
  /** Stops listening. */
  stop: () => void;
}

/**
 * Records how the person behaves while a challenge is on screen, for the behaviour check of the
 * service: pointer positions relative to the widget, the rhythm of key presses in the answer box
 * (never the keys), and signs of a script. Start it when the challenge is shown and stop it when
 * the challenge goes. Shared by renderWidget and <WauCaptcha /> from @waucaptcha-sdk/react; nothing
 * leaves the page until a snapshot is sent with an answer.
 */
export function recordBehavior({ root, input, page = false }: BehaviorRecorderOptions): BehaviorRecorder {
  const start = performance.now();
  const pointer: Behavior["pointer"] = [];
  const keyTimes: number[] = [];
  let pointerType = "";
  let lastMove = -Infinity;
  let inputEvents = 0;
  let pasteEvents = 0;
  let untrusted = 0;
  let hiddenMs = 0;
  let hiddenSince = document.hidden ? start : null;
  // auto_check's pointer evidence, over every trusted mouse move: counts and the gaps between moves
  // in whole ms, nothing per move.
  let moves = 0;
  let coalesced = 0;
  let unmoved = 0;
  let noCoalescedEvents = false;
  let previousTime: number | null = null;
  let previousX = 0;
  let previousY = 0;
  const gaps = new Uint32Array(MAX_GAP_MS + 1);

  /**
   * A mouse moved by hand is often polled faster than the screen redraws, so the browser coalesces
   * moves, and it reports the movement with every move; a fixed timer spaces moves evenly.
   */
  function count(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    moves++;
    if (typeof event.getCoalescedEvents !== "function") noCoalescedEvents = true;
    else if (event.getCoalescedEvents().length > 1) coalesced++;
    if (previousTime !== null) {
      if (event.movementX === 0 && event.movementY === 0 && (event.clientX !== previousX || event.clientY !== previousY)) unmoved++;
      const gap = Math.round(event.timeStamp - previousTime);
      if (gap >= 0 && gap <= MAX_GAP_MS) gaps[gap]++;
    }
    previousTime = event.timeStamp;
    previousX = event.clientX;
    previousY = event.clientY;
  }

  function sample(event: PointerEvent) {
    // Moves a page script makes up elsewhere say nothing about the person; on the widget they count below.
    if (!event.isTrusted) return;
    const t = event.timeStamp - start;
    if (event.type === "pointermove") {
      if (page) count(event);
      if (t - lastMove < MIN_MOVE_INTERVAL_MS) return;
      lastMove = t;
    }
    pointerType = event.pointerType;
    const box = root.getBoundingClientRect();
    pointer.push({ t: Math.max(0, Math.round(t)), x: round1(event.clientX - box.left), y: round1(event.clientY - box.top) });
    if (pointer.length > MAX_POINTER) pointer.shift();
  }

  function check(event: Event) {
    if (!event.isTrusted) untrusted++;
  }

  function key(event: KeyboardEvent) {
    if (!event.isTrusted || event.repeat) return;
    keyTimes.push(event.timeStamp);
    if (keyTimes.length > MAX_KEY_INTERVALS + 1) keyTimes.shift();
  }

  function typed(event: Event) {
    // A paste also fires an input event; it is counted as the paste.
    if (event.isTrusted && (event as InputEvent).inputType !== "insertFromPaste") inputEvents++;
  }

  function pasted(event: Event) {
    if (event.isTrusted) pasteEvents++;
  }

  function visibility() {
    const now = performance.now();
    if (document.hidden) hiddenSince = now;
    else if (hiddenSince !== null) {
      hiddenMs += now - hiddenSince;
      hiddenSince = null;
    }
  }

  document.addEventListener("pointermove", sample, { passive: true, capture: true });
  if (page) document.addEventListener("pointerdown", sample, { passive: true, capture: true });
  else root.addEventListener("pointerdown", sample, { passive: true, capture: true });
  for (const type of CHECKED_EVENTS) root.addEventListener(type, check, true);
  // Before the widget's own handlers, so that the key that sends the answer is in it too.
  input?.addEventListener("keydown", key, true);
  input?.addEventListener("input", typed);
  input?.addEventListener("paste", pasted);
  document.addEventListener("visibilitychange", visibility);

  return {
    snapshot() {
      const now = performance.now();
      const intervals = keyTimes.slice(1).map((time, i) => Math.round(time - keyTimes[i]));
      return {
        version: 1,
        elapsed_ms: Math.round(now - start),
        pointer: pointer.slice(),
        pointer_type: pointerType,
        key_intervals_ms: intervals,
        input_events: inputEvents,
        paste_events: pasteEvents,
        untrusted_events: untrusted,
        webdriver: navigator.webdriver === true,
        hidden_ms: Math.round(hiddenMs + (hiddenSince === null ? 0 : now - hiddenSince)),
        ...browserHints(),
      };
    },
    pointerSummary() {
      let common = 0;
      for (let gap = 1; gap <= MAX_GAP_MS; gap++) if (gaps[gap] > gaps[common]) common = gap;
      const steady = (common > 0 ? gaps[common - 1] : 0) + gaps[common] + (common < MAX_GAP_MS ? gaps[common + 1] : 0);
      return { n: moves, k: noCoalescedEvents ? -1 : coalesced, z: unmoved, s: steady };
    },
    stop() {
      document.removeEventListener("pointermove", sample, { capture: true });
      if (page) document.removeEventListener("pointerdown", sample, { capture: true });
      else root.removeEventListener("pointerdown", sample, { capture: true });
      for (const type of CHECKED_EVENTS) root.removeEventListener(type, check, true);
      input?.removeEventListener("keydown", key, true);
      input?.removeEventListener("input", typed);
      input?.removeEventListener("paste", pasted);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}

/**
 * What the browser says about itself (see Behavior). Android WebView sends a Chrome user agent but
 * has no window.chrome, so it is not taken for a headless Chrome.
 */
export function browserHints(): Pick<Behavior, "headless_ua" | "no_languages" | "chrome_without_window_chrome"> {
  const userAgent = navigator.userAgent ?? "";
  const chrome = /\bChrome\/\d/.test(userAgent) && !/; wv\)/.test(userAgent);
  return {
    headless_ua: userAgent.includes("HeadlessChrome"),
    no_languages: !navigator.languages || navigator.languages.length === 0,
    chrome_without_window_chrome: chrome && !("chrome" in globalThis),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
