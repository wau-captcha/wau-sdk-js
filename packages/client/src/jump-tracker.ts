import type { Challenge, JumpClick } from "./client.js";

// The service reads up to 3 replays a round, and clicks up to 30 s into their playback.
const MAX_REPLAYS = 3;
const MAX_CLICK_MS = 30_000;
/** How long the ring marks a click before the next round starts. */
const MARK_MS = 250;

export interface JumpState {
  /** The round on screen, from 0, and how many there are. */
  round: number;
  rounds: number;
  /** Whether Replay can be used: the round has no click yet and replays left. */
  canReplay: boolean;
  /** Where the click of this round landed, in CSS pixels of the image, while the ring marks it. */
  mark: { x: number; y: number } | null;
}

export interface JumpTrackerOptions {
  /** The element the rounds play in, as large as the image. Each playback puts a fresh <img> into it. */
  screen: HTMLElement;
  /** An animal_jump challenge, which has a secondImage. */
  challenge: Challenge;
  /** The alt text of the images. */
  imageAlt: string;
  /** Whether clicks and replays count now; while it returns false they are ignored. Default: always. */
  enabled?: (() => boolean) | undefined;
  /** Called on every change, to draw the round counter, the ring and the Replay button. */
  onChange: (state: JumpState) => void;
  /** The click of each round, in order, once the last round is clicked. */
  onAnswer: (clicks: JumpClick[]) => void;
}

export interface JumpTracker {
  /** Plays the round on screen again from its first frame. */
  replay: () => void;
  /** Stops recording, removes the images and frees their object URLs. */
  stop: () => void;
}

/** One playback of a round: its image, its object URL, and the timeStamp of its load event once loaded. */
interface Playback {
  image: HTMLImageElement;
  url: string;
  start: number | null;
}

/**
 * Plays the rounds of an animal_jump challenge one after the other and records a click on each
 * the way the service checks them: where it landed in CSS pixels of the image, the ms since its
 * playback started, and the replays used. Shared by renderWidget and <WauCaptcha /> from
 * @wau-captcha/react. Returns the Replay action and a function that stops it all.
 *
 * Browsers share the animation of every image with the same URL, so each playback is a fresh <img>
 * with an object URL of its own, which plays once from the first frame; it is timed from its load
 * event. The image before it stays on screen until it has loaded, so a replay does not flash.
 */
export function trackJump({ screen, challenge, imageAlt, enabled = () => true, onChange, onAnswer }: JumpTrackerOptions): JumpTracker {
  const blobs = [challenge.imageUrl, challenge.secondImage].flatMap((url) => (url ? [blobOf(url)] : []));
  const clicks: JumpClick[] = [];
  let round = 0;
  let replays = 0;
  let clicked = false;
  let stopped = false;
  let mark: JumpState["mark"] = null;
  // The playback on screen, and the one loading to take its place.
  let shown: Playback | null = null;
  let loading: Playback | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function report() {
    onChange({ round, rounds: blobs.length, canReplay: !clicked && replays < MAX_REPLAYS, mark });
  }

  function play() {
    // One still loading never showed: the new one replaces it.
    if (loading) drop(loading);
    const image = document.createElement("img");
    const playback: Playback = { image, url: URL.createObjectURL(blobs[round]), start: null };
    image.alt = imageAlt;
    image.draggable = false;
    image.addEventListener(
      "load",
      (event) => {
        if (loading !== playback) return;
        loading = null;
        if (shown) drop(shown);
        shown = playback;
        playback.start = event.timeStamp;
      },
      { once: true },
    );
    image.src = playback.url;
    loading = playback;
    screen.append(image);
  }

  function drop(playback: Playback) {
    playback.image.remove();
    URL.revokeObjectURL(playback.url);
  }

  function click(event: MouseEvent) {
    const start = shown?.start;
    // Nothing to aim at before the playback has loaded, and a round takes one click.
    if (clicked || loading || start == null || !enabled()) return;
    const box = screen.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const x = clamp(((event.clientX - box.left) * challenge.width) / box.width, challenge.width);
    const y = clamp(((event.clientY - box.top) * challenge.height) / box.height, challenge.height);
    // A later click has seen the jump all the same.
    clicks.push({ x, y, ms: clamp(event.timeStamp - start, MAX_CLICK_MS), replays });
    clicked = true;
    mark = { x, y };
    report();
    const last = round === blobs.length - 1;
    // No word after a round: the answer is judged once, after the last, so a script cannot learn
    // which round it got wrong.
    if (last) onAnswer(clicks.slice());
    timer = setTimeout(() => {
      mark = null;
      if (!last) {
        round++;
        replays = 0;
        clicked = false;
        play();
      }
      report();
    }, MARK_MS);
  }

  screen.addEventListener("click", click);
  play();
  report();
  return {
    replay() {
      if (stopped || clicked || replays >= MAX_REPLAYS || !enabled()) return;
      replays++;
      play();
      report();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      screen.removeEventListener("click", click);
      if (shown) drop(shown);
      if (loading) drop(loading);
      shown = loading = null;
    },
  };
}

/** The bytes of a data: URL as a Blob, so that each playback gets an object URL of its own. */
function blobOf(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const type = dataUrl.slice("data:".length, comma).split(";")[0];
  return new Blob([Uint8Array.from(atob(dataUrl.slice(comma + 1)), (char) => char.charCodeAt(0))], { type });
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}
