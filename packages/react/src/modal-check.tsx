import { CheckIcon } from "./icons.js";
import type { WauCaptchaLabels } from "./labels.js";
import { Mark } from "./mark.js";

export type ModalCheckProps = {
  /** The check and Verified instead of the empty box and its text. */
  verified: boolean;
  labels: WauCaptchaLabels;
  /** Opens the dialog with the challenge. */
  onOpen: () => void;
};

/**
 * The box of MODAL mode, in the look of auto_check's: an empty checkbox that opens the dialog with
 * the challenge where auto_check shows its spinner, then the check and Verified once the answer is
 * right. It is one checkbox throughout, checked at the end rather than replaced, so the focus the
 * dialog gives back when it closes stays on it.
 */
export function ModalCheck({ verified, labels, onOpen }: ModalCheckProps) {
  return (
    <div className="wau-captcha__panel">
      <div className="wau-captcha__auto" data-tone={verified ? "positive" : undefined}>
        <button
          type="button"
          role="checkbox"
          aria-checked={verified}
          aria-disabled={verified || undefined}
          aria-haspopup={verified ? undefined : "dialog"}
          className="wau-captcha__check"
          onClick={verified ? undefined : onOpen}
        >
          {verified ? <CheckIcon /> : <span className="wau-captcha__check-box" aria-hidden="true" />}
          <span className="wau-captcha__auto-text">{verified ? labels.verified : labels.notRobot}</span>
        </button>
        <Mark />
      </div>
    </div>
  );
}
