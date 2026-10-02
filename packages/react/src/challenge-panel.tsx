import { ChallengeType, type SlideDrag } from "@wau-captcha/client";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { CheckIcon, RefreshIcon, SpinnerIcon } from "./icons.js";
import type { WauCaptchaLabels } from "./labels.js";
import { SlidePuzzle } from "./slide-puzzle.js";
import { type Captcha, CaptchaNotice, CaptchaStatus } from "./use-captcha.js";

/** Width / height of each challenge image, to hold its place while it loads. */
const IMAGE_ASPECT_RATIO: Record<ChallengeType, string> = {
  [ChallengeType.IMAGE_DISTORT]: "200 / 70",
  [ChallengeType.MOTION_NOISE]: "300 / 150",
  [ChallengeType.SLIDE_PUZZLE]: "300 / 150",
};

export type ChallengePanelProps = {
  captcha: Captcha;
  labels: WauCaptchaLabels;
  challengeType: ChallengeType;
};

/**
 * The challenge image, the answer box, Verify and New challenge, and a status line. For
 * slide_puzzle the piece and its slider take the place of the image, the box and Verify.
 */
export function ChallengePanel({ captcha, labels, challengeType }: ChallengePanelProps) {
  const { status, notice, challenge, error } = captcha;
  const answerInputRef = useRef<HTMLInputElement>(null);
  // Set when an answer is sent, so the answer box gets the focus back if another try is needed.
  const refocusPendingRef = useRef(false);
  const answerable = status === CaptchaStatus.READY && challenge !== null;
  const loading = status === CaptchaStatus.LOADING;
  const checking = status === CaptchaStatus.CHECKING;
  const verified = status === CaptchaStatus.VERIFIED;
  const failed = status === CaptchaStatus.FAILED;
  // The type of the challenge on screen or, before one arrived, the type asked for.
  const sliding = challenge ? challenge.piece !== undefined : challengeType === ChallengeType.SLIDE_PUZZLE;

  useEffect(() => {
    if (answerInputRef.current) answerInputRef.current.value = "";
  }, [challenge]);

  useEffect(() => {
    if (!refocusPendingRef.current || loading || checking) return;
    refocusPendingRef.current = false;
    if (answerable) answerInputRef.current?.focus();
  }, [answerable, loading, checking]);

  function submit() {
    const answer = answerInputRef.current?.value.trim();
    if (!answerable || !answer) return;
    refocusPendingRef.current = true;
    void captcha.verify(challenge.id, answer);
  }

  function submitDrag(drag: SlideDrag) {
    if (answerable) void captcha.verifySlide(challenge.id, drag);
  }

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    // Keep Enter from submitting the surrounding form before the captcha is solved.
    event.preventDefault();
    submit();
  }

  const notices: Record<CaptchaNotice, string> = {
    [CaptchaNotice.WRONG_ANSWER]: labels.wrong,
    [CaptchaNotice.EXPIRED]: labels.expired,
  };
  const message = verified ? labels.verified : failed ? `${labels.failed} (${error?.code})` : notice && notices[notice];

  return (
    <div className="wau-captcha__panel">
      {!verified && (
        <>
          {sliding ? (
            <SlidePuzzle
              key={challenge?.id}
              challenge={challenge}
              aspectRatio={IMAGE_ASPECT_RATIO[challengeType]}
              answerable={answerable}
              checking={checking}
              labels={labels}
              onDrag={submitDrag}
            />
          ) : (
            <>
              {challenge ? (
                <img
                  className="wau-captcha__image"
                  src={challenge.imageUrl}
                  width={challenge.width}
                  height={challenge.height}
                  alt={labels.imageAlt}
                />
              ) : (
                <div className="wau-captcha__image" style={{ aspectRatio: IMAGE_ASPECT_RATIO[challengeType] }} />
              )}
              <label className="wau-captcha__field">
                {labels.prompt}
                <input
                  ref={answerInputRef}
                  className="wau-captcha__input"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  readOnly={!answerable}
                  onKeyDown={submitOnEnter}
                />
              </label>
            </>
          )}
          <div className="wau-captcha__actions">
            {!sliding && (
              <button
                type="button"
                className="wau-captcha__button"
                data-variant="primary"
                disabled={!answerable}
                aria-busy={checking || undefined}
                onClick={submit}
              >
                {checking && <SpinnerIcon />}
                {labels.verify}
              </button>
            )}
            <button
              type="button"
              className="wau-captcha__button"
              data-variant="outline"
              data-size="icon"
              aria-label={labels.refresh}
              title={labels.refresh}
              disabled={loading || checking}
              aria-busy={loading || undefined}
              onClick={() => void captcha.load()}
            >
              {loading ? <SpinnerIcon /> : <RefreshIcon />}
            </button>
          </div>
        </>
      )}
      <p className="wau-captcha__status" role="status" data-tone={verified ? "positive" : failed ? "negative" : undefined}>
        {verified && <CheckIcon />}
        {message}
      </p>
    </div>
  );
}
