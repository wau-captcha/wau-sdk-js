import type { Challenge, SlideDrag } from "./client.js";
import { createElement } from "./dom.js";
import type { WidgetLabels } from "./labels.js";
import { trackSlide } from "./slide-tracker.js";

/** The arrow on the handle, drawn like the icons of @wau-captcha/react. */
const ARROW_ICON =
  '<svg class="wau-captcha__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

export interface SlidePuzzleView {
  /** The background with the piece over it. */
  puzzle: HTMLDivElement;
  /** The track with the prompt and the handle that drags the piece. */
  track: HTMLDivElement;
  /** Shows a slide_puzzle challenge, the piece back at x = 0. */
  show: (challenge: Challenge) => void;
  setDisabled: (disabled: boolean) => void;
}

/** A share of `whole` as a CSS percentage, so the piece and the handle scale with the image. */
function percent(part: number, whole: number): string {
  return `${(part / whole) * 100}%`;
}

/** The slide_puzzle part of renderWidget. Releasing the handle passes the drag to onDrag. */
export function createSlidePuzzle(labels: WidgetLabels, onDrag: (drag: SlideDrag) => void): SlidePuzzleView {
  const puzzle = createElement("div", "wau-captcha__puzzle");
  const image = createElement("img", "wau-captcha__image");
  image.alt = labels.imageAlt;
  image.draggable = false;
  const piece = createElement("img", "wau-captcha__piece");
  piece.alt = "";
  piece.draggable = false;
  puzzle.append(image, piece);
  const track = createElement("div", "wau-captcha__track");
  const prompt = createElement("span", "wau-captcha__track-label");
  prompt.textContent = labels.slidePrompt;
  const handle = createElement("button", "wau-captcha__handle");
  handle.type = "button";
  handle.setAttribute("aria-label", labels.sliderHandle);
  handle.innerHTML = ARROW_ICON;
  track.append(prompt, handle);

  let stopTracking = () => {};
  return {
    puzzle,
    track,
    show(challenge) {
      stopTracking();
      if (!challenge.piece) return;
      const { width, height } = challenge;
      image.src = challenge.imageUrl;
      image.width = width;
      image.height = height;
      piece.src = challenge.piece.imageUrl;
      piece.style.top = percent(challenge.piece.y, height);
      piece.style.width = handle.style.width = percent(challenge.piece.width, width);
      const move = (x: number) => {
        piece.style.left = handle.style.left = percent(x, width);
      };
      move(0);
      stopTracking = trackSlide({ handle, image, challenge, onMove: move, onRelease: onDrag });
    },
    setDisabled(disabled) {
      handle.disabled = disabled;
    },
  };
}
