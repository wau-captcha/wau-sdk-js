"use client";

import { ChallengeType, type WauCaptchaError } from "@wau-captcha/client";
import { useState } from "react";
import { CaptchaDialog } from "./captcha-dialog.js";
import { CaptchaStyles } from "./captcha-styles.js";
import { ChallengePanel } from "./challenge-panel.js";
import { WauCaptchaMode, WauCaptchaTheme } from "./constants.js";
import { CheckIcon, ShieldIcon } from "./icons.js";
import { DEFAULT_LABELS, type WauCaptchaLabels } from "./labels.js";
import { CaptchaNotice, CaptchaStatus, useCaptcha } from "./use-captcha.js";

export type WauCaptchaProps = {
  /** Public site key of the API key, "pk_…". */
  siteKey: string;
  /** Address of the WAU Captcha API, e.g. https://captcha.example.com. */
  baseUrl: string;
  /** INLINE (default) shows the challenge in place; MODAL shows a button that opens it in a dialog. */
  mode?: WauCaptchaMode | undefined;
  /** Default ChallengeType.IMAGE_DISTORT. */
  challengeType?: ChallengeType | undefined;
  /** Default WauCaptchaTheme.AUTO, which follows the color-scheme of the page. */
  theme?: WauCaptchaTheme | undefined;
  /** Name of the hidden input that carries the token in the surrounding form. Default "wau-captcha-token". */
  inputName?: string | undefined;
  labels?: Partial<WauCaptchaLabels> | undefined;
  /** How long to wait for each reply. Default 10 000. */
  timeoutMs?: number | undefined;
  /** Called with the token of a correct answer; your backend redeems it with @wau-captcha/server. */
  onSuccess?: ((token: string) => void) | undefined;
  /** Called when the token expires unused. INLINE starts over by itself; MODAL waits for the button. */
  onExpire?: (() => void) | undefined;
  onError?: ((error: WauCaptchaError) => void) | undefined;
  className?: string | undefined;
};

/**
 * A captcha for your forms. A correct answer puts the token into a hidden input named
 * `inputName`, so the form sends it with its other fields. To start over, e.g. after the
 * backend has redeemed the token, change the component's `key`.
 */
export function WauCaptcha({
  mode = WauCaptchaMode.INLINE,
  challengeType = ChallengeType.IMAGE_DISTORT,
  theme = WauCaptchaTheme.AUTO,
  inputName = "wau-captcha-token",
  labels: customLabels,
  className,
  ...options
}: WauCaptchaProps) {
  const labels = { ...DEFAULT_LABELS, ...customLabels };
  const modal = mode === WauCaptchaMode.MODAL;
  const captcha = useCaptcha({ ...options, challengeType, eager: !modal });
  const [open, setOpen] = useState(false);
  const verified = captcha.status === CaptchaStatus.VERIFIED;

  // The dialog closes by itself once the answer is right.
  if (open && verified) setOpen(false);

  function openDialog() {
    const { challenge, status } = captcha;
    const usable = challenge !== null && challenge.expiresAt.getTime() > Date.now();
    if (!usable && status !== CaptchaStatus.LOADING) void captcha.load();
    setOpen(true);
  }

  const panel = <ChallengePanel captcha={captcha} labels={labels} challengeType={challengeType} />;

  return (
    <div className={className ? `wau-captcha ${className}` : "wau-captcha"} data-mode={mode} data-theme={theme}>
      <CaptchaStyles />
      {modal ? (
        <>
          <button type="button" className="wau-captcha__trigger" aria-haspopup="dialog" disabled={verified} onClick={openDialog}>
            {verified ? <CheckIcon /> : <ShieldIcon />}
            {verified ? labels.verified : labels.open}
          </button>
          {captcha.notice === CaptchaNotice.EXPIRED && !open && (
            <p className="wau-captcha__status" role="status">
              {labels.expired}
            </p>
          )}
          <CaptchaDialog open={open} onClose={() => setOpen(false)} title={labels.open} closeLabel={labels.close}>
            {panel}
          </CaptchaDialog>
        </>
      ) : (
        panel
      )}
      <input type="hidden" name={inputName} value={captcha.token ?? ""} />
    </div>
  );
}
