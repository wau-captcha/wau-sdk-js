import type { Challenge, RotatePress, RotateRound } from "./client.js";

// What the service reads: at most 24 presses a round, the first at least 250 ms after the round
// is shown and each at least 60 ms after the one before. Presses that would break it are dropped,
// so the frame on screen always matches the presses sent.
const MAX_PRESSES = 24;
const MIN_FIRST_PRESS_MS = 250;
const MIN_PRESS_GAP_MS = 60;

export interface RotateState {
  /** The round on screen, from 0, and how many there are. */
  round: number;
  rounds: number;
  /** The frame on screen, from 0, and how many the strip has. */
  frame: number;
  frames: number;
  /** Whether Rotate left and Rotate right count now: the round is shown and has presses left. */
  canRotate: boolean;
  /** Whether Done counts now: the round is shown and has a press. */
  canFinish: boolean;
}

export interface RotateTrackerOptions {
  /** The element the frame shows in, as large as a frame: the strip is its background. */
  screen: HTMLElement;
  /** An object_rotate challenge, which has a secondImage and a frameCount. */
  challenge: Challenge;
  /** Whether presses count now; while it returns false they are ignored. Default: always. */
  enabled?: (() => boolean) | undefined;
  /** Called on every change, to draw the round counter and the buttons. */
  onChange: (state: RotateState) => void;
  /** The presses of each round, in order, once Done is pressed on the last. */
  onAnswer: (rounds: RotateRound[]) => void;
}

export interface RotateTracker {
  /** Turns the object a frame: 1 to the right, clockwise as seen from above; -1 to the left. */
  rotate: (direction: 1 | -1) => void;
  /** Ends the round on the frame on screen: the next round follows, or the answer after the last. */
  done: () => void;
  /** Stops recording and clears the frame. */
  stop: () => void;
}

/**
 * Shows the rounds of an object_rotate challenge one after the other, a frame of the strip at a
 * time, and records the presses of each the way the service checks them: whole ms since the round
 * was shown, and the frame on screen when Done was pressed. Shared by renderWidget and
 * <WauCaptcha /> from @wau-captcha/react. The frame starts at 0; Rotate right goes to the next,
 * Rotate left to the one before, round the strip both ways.
 *
 * Round 1 is timed from the load event of its strip; round 2, which loads meanwhile, from when it
 * is shown. The strip is the background of `screen`, sized to frameCount frames across and moved
 * to the frame on screen.
 */
export function trackRotate({ screen, challenge, enabled = () => true, onChange, onAnswer }: RotateTrackerOptions): RotateTracker {
  const strips = [challenge.imageUrl, challenge.secondImage].flatMap((url) => (url ? [url] : []));
  const frames = Math.max(challenge.frameCount ?? 1, 1);
  const rounds: RotateRound[] = [];
  const loaded = strips.map(() => false);
  let round = 0;
  let frame = 0;
  let presses: RotatePress[] = [];
  // When the round on screen was shown, in the time of performance.now(); null until it is.
  let start: number | null = null;
  let ready = false;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function report() {
    const answerable = ready && !stopped;
    onChange({
      round,
      rounds: strips.length,
      frame,
      frames,
      canRotate: answerable && presses.length < MAX_PRESSES,
      canFinish: answerable && presses.length > 0,
    });
  }

  function draw() {
    screen.style.backgroundPosition = `${frames > 1 ? (frame / (frames - 1)) * 100 : 0}% 0`;
  }

  /** Puts the strip of the round on screen and starts its clock at `at`. */
  function show(at: number) {
    screen.style.backgroundImage = `url("${strips[round]}")`;
    screen.style.backgroundSize = `${frames * 100}% 100%`;
    frame = 0;
    draw();
    start = at;
    // Presses before the first could be made are not taken: the buttons wait as long.
    timer = setTimeout(() => {
      ready = true;
      report();
    }, MIN_FIRST_PRESS_MS);
    report();
  }

  // Both strips load at once, so round 2 is there when round 1 is done.
  strips.forEach((url, index) => {
    const image = new Image();
    image.addEventListener(
      "load",
      (event) => {
        loaded[index] = true;
        if (!stopped && index === round && start === null) show(event.timeStamp);
      },
      { once: true },
    );
    image.src = url;
  });

  function elapsed(): number | null {
    return start === null ? null : Math.round(performance.now() - start);
  }

  report();
  return {
    rotate(direction) {
      const ms = elapsed();
      if (stopped || !ready || ms === null || presses.length >= MAX_PRESSES || !enabled()) return;
      const last = presses[presses.length - 1];
      if (ms < MIN_FIRST_PRESS_MS || (last && ms - last.ms < MIN_PRESS_GAP_MS)) return;
      presses.push({ ms, direction });
      frame = (frame + direction + frames) % frames;
      draw();
      report();
    },
    done() {
      const ms = elapsed();
      if (stopped || !ready || ms === null || presses.length === 0 || !enabled()) return;
      const last = presses[presses.length - 1];
      rounds.push({ frame, presses, doneMs: Math.max(ms, (last?.ms ?? 0) + 1) });
      // No word after a round: the answer is judged once, after the last, so a script cannot
      // learn which round it got wrong.
      if (round === strips.length - 1) {
        ready = false;
        report();
        onAnswer(rounds.slice());
        return;
      }
      round++;
      presses = [];
      ready = false;
      start = null;
      clearTimeout(timer);
      if (loaded[round]) show(performance.now());
      else report();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      screen.style.backgroundImage = "";
    },
  };
}
