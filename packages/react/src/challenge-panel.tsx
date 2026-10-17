import {
  Appearance,
  type BehaviorRecorder,
  ChallengeType,
  ErrorCode,
  type JumpClick,
  probeBrowser,
  type RotateRound,
  recordBehavior,
  type SlideDrag,
  type WauCaptchaError,
} from "@waucaptcha-sdk/client";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { AnimalJump } from "./animal-jump.js";
import { AutoCheck } from "./auto-check.js";
import { CheckIcon, RefreshIcon, SpinnerIcon } from "./icons.js";
import type { WauCaptchaLabels } from "./labels.js";
import { ObjectRotate } from "./object-rotate.js";
import { SlidePuzzle } from "./slide-puzzle.js";
import { type Captcha, CaptchaNotice, CaptchaStatus } from "./use-captcha.js";

/** Width / height of each challenge image, to hold its place while it loads; auto_check has none, so its box. */
const IMAGE_ASPECT_RATIO: Record<ChallengeType, string> = {
  [ChallengeType.IMAGE_DISTORT]: "200 / 70",
  [ChallengeType.MOTION_NOISE]: "300 / 150",
  [ChallengeType.SLIDE_PUZZLE]: "300 / 150",
  [ChallengeType.ANIMAL_JUMP]: "2 / 1",
  [ChallengeType.OBJECT_ROTATE]: "2 / 1",
  [ChallengeType.AUTO_CHECK]: "300 / 64",
};

/**
 * auto_check answers no sooner than this after its challenge arrived, as renderWidget does: the
 * service judges an answer recorded over less than 1 s automated.
 */
const AUTO_CHECK_MIN_MS = 1500;
/** The visitor's actions in the page that start auto_check again once its token expired. */
const WAKE_EVENTS = ["pointerdown", "keydown", "focus"] as const;

export type ChallengePanelProps = {
  captcha: Captcha;
  labels: WauCaptchaLabels;
  challengeType: ChallengeType;
  /** auto_check only: whether the box shows while it checks and once it passed. */
  appearance: Appearance;
};

/**
 * The challenge image, the answer box, Verify and New challenge, and a status line. For
 * slide_puzzle the piece and its slider take the place of the image, the box and Verify; for
 * animal_jump the rounds and the Replay button do; for object_rotate the rounds with Rotate left,
 * Rotate right and Done. For auto_check a compact box checks the visitor, and the panel of its
 * fallback type takes its place when the check does not let them through.
 */
export function ChallengePanel({ captcha, labels, challengeType, appearance }: ChallengePanelProps) {
  const { status, notice, challenge, error, fallback, load, verifyAuto, workDone } = captcha;
  const panelRef = useRef<HTMLDivElement>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);
  // How the person behaves while this challenge is on screen; the service checks it with the answer.
  const recorderRef = useRef<BehaviorRecorder | null>(null);
  // Set when an answer is sent, so the answer box gets the focus back if another try is needed.
  const refocusPendingRef = useRef(false);
  const answerable = status === CaptchaStatus.READY && challenge !== null;
  const loading = status === CaptchaStatus.LOADING;
  const checking = status === CaptchaStatus.CHECKING;
  const verified = status === CaptchaStatus.VERIFIED;
  const failed = status === CaptchaStatus.FAILED;
  // The type asked for: the one the site named or, once auto_check fell back, its fallback.
  const asked = fallback ?? challengeType;
  const automatic = asked === ChallengeType.AUTO_CHECK;
  // The type of the challenge on screen or, before one arrived, the type asked for.
  const sliding = challenge ? challenge.piece !== undefined : asked === ChallengeType.SLIDE_PUZZLE;
  const rotating = challenge ? challenge.frameCount !== undefined : asked === ChallengeType.OBJECT_ROTATE;
  const jumping = challenge ? challenge.secondImage !== undefined && !rotating : asked === ChallengeType.ANIMAL_JUMP;

  useEffect(() => {
    if (answerInputRef.current) answerInputRef.current.value = "";
  }, [challenge]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!challenge || !panel) return;
    // auto_check is never touched, so it records the presses on the whole page, measured from where
    // the captcha sits even while interaction-only hides it.
    const auto = challenge.type === ChallengeType.AUTO_CHECK;
    const root = auto ? (panel.closest<HTMLElement>(".wau-captcha") ?? panel) : panel;
    // object_rotate is turned with the arrow keys too: its key presses are timed on the whole panel.
    const keys = auto ? null : challenge.frameCount ? panel : challenge.piece || challenge.secondImage ? null : answerInputRef.current;
    const recorder = recordBehavior({ root, input: keys, page: auto });
    recorderRef.current = recorder;
    return () => {
      recorder.stop();
      if (recorderRef.current === recorder) recorderRef.current = null;
    };
  }, [challenge]);

  // auto_check probes the browser while the proof of work is found, and sends both with the behaviour
  // recorded until then. Counted from the challenge, not from when the box came into view, so a slow
  // connection cannot leave the time recorded under what the service accepts.
  useEffect(() => {
    if (status !== CaptchaStatus.READY || challenge?.type !== ChallengeType.AUTO_CHECK) return;
    let live = true;
    void Promise.all([probeBrowser(), workDone(challenge.id), delay(AUTO_CHECK_MIN_MS)]).then(([probe]) => {
      const recorder = recorderRef.current;
      if (live) void verifyAuto(challenge, { ...probe, pointer: recorder?.pointerSummary() }, recorder?.snapshot());
    });
    return () => {
      live = false;
    };
  }, [status, challenge, workDone, verifyAuto]);

  // auto_check starts once the captcha is in view, so a captcha never seen costs the key nothing; after
  // its token expired, on the visitor's next action, so an idle tab does not pass again and again.
  useEffect(() => {
    const panel = panelRef.current;
    if (!automatic || status !== CaptchaStatus.IDLE || !panel) return;
    if (notice === CaptchaNotice.EXPIRED) return onNextAction(() => void load());
    return whenInView(panel.closest(".wau-captcha") ?? panel, () => void load());
  }, [automatic, status, notice, load]);

  useEffect(() => {
    if (!refocusPendingRef.current || loading || checking) return;
    refocusPendingRef.current = false;
    if (answerable) answerInputRef.current?.focus();
  }, [answerable, loading, checking]);

  function submit() {
    const answer = answerInputRef.current?.value.trim();
    if (!answerable || !answer) return;
    refocusPendingRef.current = true;
    void captcha.verify(challenge.id, answer, recorderRef.current?.snapshot());
  }

  function submitDrag(drag: SlideDrag) {
    if (answerable) void captcha.verifySlide(challenge.id, drag, recorderRef.current?.snapshot());
  }

  function submitClicks(clicks: JumpClick[]) {
    if (answerable) void captcha.verifyJump(challenge.id, clicks, recorderRef.current?.snapshot());
  }

  function submitRounds(rounds: RotateRound[]) {
    if (answerable) void captcha.verifyRotate(challenge.id, rounds, recorderRef.current?.snapshot());
  }

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    // Keep Enter from submitting the surrounding form before the captcha is solved.
    event.preventDefault();
    submit();
  }

  if (automatic) {
    // Only New challenge once it failed, which runs the check again.
    return (
      <div ref={panelRef} className="wau-captcha__panel" hidden={(appearance === Appearance.INTERACTION_ONLY && !failed) || undefined}>
        {failed ? (
          <>
            <div className="wau-captcha__actions">
              <button
                type="button"
                className="wau-captcha__button"
                data-variant="outline"
                data-size="icon"
                aria-label={labels.refresh}
                title={labels.refresh}
                onClick={() => void load()}
              >
                <RefreshIcon />
              </button>
            </div>
            <p className="wau-captcha__status" role="status" data-tone="negative">
              {failure(labels, error)}
            </p>
          </>
        ) : (
          <AutoCheck passed={verified} labels={labels} />
        )}
      </div>
    );
  }

  const notices: Record<CaptchaNotice, string> = {
    [CaptchaNotice.WRONG_ANSWER]: labels.wrong,
    [CaptchaNotice.EXPIRED]: labels.expired,
    [CaptchaNotice.FALLBACK]: labels.autoFallback,
  };
  const message = verified ? labels.verified : failed ? failure(labels, error) : notice && notices[notice];

  return (
    <div ref={panelRef} className="wau-captcha__panel">
      {!verified && (
        <>
          {sliding ? (
            <SlidePuzzle
              key={challenge?.id}
              challenge={challenge}
              aspectRatio={IMAGE_ASPECT_RATIO[asked]}
              answerable={answerable}
              checking={checking}
              labels={labels}
              onDrag={submitDrag}
            />
          ) : jumping ? (
            <AnimalJump
              key={challenge?.id}
              challenge={challenge}
              aspectRatio={IMAGE_ASPECT_RATIO[asked]}
              answerable={answerable}
              checking={checking}
              labels={labels}
              onAnswer={submitClicks}
            />
          ) : rotating ? (
            <ObjectRotate
              key={challenge?.id}
              challenge={challenge}
              aspectRatio={IMAGE_ASPECT_RATIO[asked]}
              answerable={answerable}
              checking={checking}
              labels={labels}
              onAnswer={submitRounds}
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
                <div className="wau-captcha__image" style={{ aspectRatio: IMAGE_ASPECT_RATIO[asked] }} />
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
            {!sliding && !jumping && !rotating && (
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
              onClick={() => void load()}
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

/** What the status line says once loading or checking failed. */
function failure(labels: WauCaptchaLabels, error: WauCaptchaError | null): string {
  if (error?.code === ErrorCode.RATE_LIMITED) return labels.rateLimited.replace("{seconds}", String(error.retryAfter ?? 60));
  return `${labels.failed} (${error?.code})`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Calls `start` once `element` is at least partly in view, or at once where IntersectionObserver is missing; returns what stops waiting. */
function whenInView(element: Element, start: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") {
    start();
    return () => {};
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    start();
  });
  observer.observe(element);
  return () => observer.disconnect();
}

/** Calls `start` on the visitor's next press, key or focus in the page, not one a script made up; returns what stops waiting. */
function onNextAction(start: () => void): () => void {
  const wake = (event: Event) => {
    if (!event.isTrusted) return;
    stop();
    start();
  };
  // Capturing on window sees the focus of every element too, which does not bubble, and the window's own.
  const stop = () => {
    for (const type of WAKE_EVENTS) window.removeEventListener(type, wake, true);
  };
  for (const type of WAKE_EVENTS) window.addEventListener(type, wake, true);
  return stop;
}
