import { createElement } from "./dom.js";
import type { WidgetLabels } from "./labels.js";

/** An icon drawn like those of @wau-captcha/react. */
function icon(path: string, className = "wau-captcha__icon"): string {
  return (
    `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`
  );
}

const SPINNER_ICON = icon("M21 12a9 9 0 1 1-9-9", "wau-captcha__icon wau-captcha__spinner");
const CHECK_ICON = icon("M20 6 9 17l-5-5");
/** The shield with a check of the WAU Captcha mark. */
const MARK_ICON = icon("M12 21s7-3.5 7-9V5.5L12 3 5 5.5V12c0 5.5 7 9 7 9zM9 12l2 2 4-4");

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
  tile.innerHTML = MARK_ICON;
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
