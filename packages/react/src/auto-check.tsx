import { CheckIcon, SpinnerIcon } from "./icons.js";
import type { WauCaptchaLabels } from "./labels.js";
import { Mark } from "./mark.js";

export type AutoCheckProps = {
  /** The check and Verified instead of the spinner and the checking text. */
  passed: boolean;
  labels: WauCaptchaLabels;
};

/** The compact box of auto_check, a status that screen readers announce when it changes. */
export function AutoCheck({ passed, labels }: AutoCheckProps) {
  return (
    <div className="wau-captcha__auto" role="status" aria-live="polite" data-tone={passed ? "positive" : undefined}>
      {passed ? <CheckIcon /> : <SpinnerIcon />}
      <span className="wau-captcha__auto-text">{passed ? labels.verified : labels.autoChecking}</span>
      <Mark />
    </div>
  );
}
