import { createElement } from "./dom.js";
import type { WidgetLabels } from "./labels.js";

/** An icon drawn like those of @waucaptcha-sdk/react. */
function icon(path: string, className = "wau-captcha__icon"): string {
  return (
    `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`
  );
}

const SPINNER_ICON = icon("M21 12a9 9 0 1 1-9-9", "wau-captcha__icon wau-captcha__spinner");
const CHECK_ICON = icon("M20 6 9 17l-5-5");
/**
 * The W of the WAU Captcha logo, in the 96-unit grid of its app tile. The icon shows the 64 units
 * around the tile's centre, so on the 18px tile the W has the size and place it has on the logo.
 */
const LOGO_ICON =
  '<svg class="wau-captcha__icon" viewBox="16 16 64 64" fill="currentColor" aria-hidden="true"><path d="M20.31 27.14C19.68 24.8 21.06 22.38 23.41 21.74C25.75 21.11 28.16 22.49 28.8 24.84L35.83 50.73L37.92 43.52C38.59 41.19 41.03 39.84 43.36 40.52C45.69 41.19 47.04 43.63 46.36 45.96L39.94 68.16C39.89 68.31 39.84 68.46 39.79 68.61C39.56 69.21 39.21 69.72 38.77 70.15C38.34 70.57 37.82 70.91 37.22 71.13C36.73 71.32 36.2 71.41 35.65 71.41C35.11 71.4 34.58 71.3 34.09 71.11C33.5 70.88 32.98 70.53 32.56 70.1C32.13 69.66 31.79 69.14 31.57 68.54C31.52 68.39 31.47 68.24 31.43 68.09L20.31 27.14ZM67.2 24.84C67.84 22.49 70.25 21.11 72.59 21.74C74.94 22.38 76.32 24.8 75.69 27.14L64.57 68.09C64.53 68.24 64.48 68.39 64.43 68.54C64.21 69.14 63.87 69.66 63.44 70.1C63.02 70.53 62.5 70.88 61.91 71.11C61.42 71.3 60.89 71.4 60.35 71.41C59.8 71.41 59.27 71.32 58.78 71.13C58.18 70.91 57.66 70.57 57.23 70.15C56.79 69.72 56.44 69.21 56.21 68.61C56.16 68.46 56.11 68.31 56.06 68.16L49.64 45.96C48.96 43.63 50.31 41.19 52.64 40.52C54.97 39.84 57.41 41.19 58.08 43.52L60.17 50.73L67.2 24.84ZM54.74 31.31C54.74 35.04 51.72 38.05 48 38.05C44.28 38.05 41.26 35.04 41.26 31.31C41.26 27.59 44.28 24.57 48 24.57C51.72 24.57 54.74 27.59 54.74 31.31Z"/></svg>';

export interface AutoCheckBoxView {
  /** The compact box of auto_check: the spinner or the check, the text and the WAU Captcha mark. */
  box: HTMLDivElement;
  /** Shows the check running, or passed. */
  show: (passed: boolean) => void;
}

/** The auto_check part of renderWidget, a status that screen readers announce when it changes. */
export function createAutoCheckBox(labels: WidgetLabels): AutoCheckBoxView {
  const box = createElement("div", "wau-captcha__auto");
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");
  box.innerHTML = SPINNER_ICON + CHECK_ICON;
  const [spinner, check] = Array.from(box.children);
  const text = createElement("span", "wau-captcha__auto-text");
  const mark = createElement("span", "wau-captcha__mark");
  const tile = createElement("span", "wau-captcha__mark-tile");
  tile.innerHTML = LOGO_ICON;
  mark.append(tile, "WAU Captcha");
  box.append(text, mark);

  return {
    box,
    show(passed) {
      spinner?.toggleAttribute("hidden", passed);
      check?.toggleAttribute("hidden", !passed);
      text.textContent = passed ? labels.verified : labels.autoChecking;
      if (passed) box.dataset.tone = "positive";
      else delete box.dataset.tone;
    },
  };
}
