import { type Challenge, type RotateRound, type RotateState, type RotateTracker, trackRotate } from "@wau-captcha/client";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { SpinnerIcon } from "./icons.js";
import type { WauCaptchaLabels } from "./labels.js";

export type ObjectRotateProps = {
  /** null while a challenge loads: a placeholder holds the place of the image and the buttons are disabled. */
  challenge: Challenge | null;
  /** Width / height of the placeholder. */
  aspectRatio: string;
  answerable: boolean;
  checking: boolean;
  labels: WauCaptchaLabels;
  onAnswer: (rounds: RotateRound[]) => void;
};

/**
 * The object_rotate challenge: the task, the frame on screen with the round counter, and Rotate
 * left, Rotate right and Done; on the frame, the arrow keys turn the object and Enter is Done. Give
 * it a new `key` for each challenge, so that it starts again at round 1.
 */
export function ObjectRotate({ challenge, aspectRatio, answerable, checking, labels, onAnswer }: ObjectRotateProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<RotateTracker | null>(null);
  const [state, setState] = useState<RotateState | null>(null);
  // The latest props, so that the parent rendering again does not restart the round.
  const latestRef = useRef({ answerable, onAnswer });
  useEffect(() => {
    latestRef.current = { answerable, onAnswer };
  });

  useEffect(() => {
    const screen = screenRef.current;
    if (!challenge?.secondImage || !challenge.frameCount || !screen) return;
    const tracker = trackRotate({
      screen,
      challenge,
      enabled: () => latestRef.current.answerable,
      onChange: setState,
      onAnswer: (rounds) => latestRef.current.onAnswer(rounds),
    });
    trackerRef.current = tracker;
    return () => {
      tracker.stop();
      trackerRef.current = null;
    };
  }, [challenge]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const tracker = trackerRef.current;
    const action = { ArrowLeft: () => tracker?.rotate(-1), ArrowRight: () => tracker?.rotate(1), Enter: () => tracker?.done() }[event.key];
    if (!action) return;
    // Arrows would scroll the page, and Enter submit the form around the captcha.
    event.preventDefault();
    // A key held down is one press, not a spin.
    if (!event.repeat && answerable) action();
  }

  const canRotate = answerable && state?.canRotate === true;
  return (
    <>
      <p className="wau-captcha__task">{labels.rotatePrompt}</p>
      {challenge?.secondImage && challenge.frameCount ? (
        <div className="wau-captcha__rotate" style={{ aspectRatio: `${challenge.width} / ${challenge.height}` }}>
          <div
            ref={screenRef}
            className="wau-captcha__rotate-frame"
            tabIndex={0}
            role="img"
            aria-label={`${labels.imageAlt}: ${labels.rotatePrompt}`}
            aria-keyshortcuts="ArrowLeft ArrowRight Enter"
            onKeyDown={onKeyDown}
          />
          {state && <span className="wau-captcha__round">{`${state.round + 1}/${state.rounds}`}</span>}
        </div>
      ) : (
        <div className="wau-captcha__image" style={{ aspectRatio }} />
      )}
      <div className="wau-captcha__rotate-bar">
        {(
          [
            [-1, labels.rotateLeft, "↺"],
            [1, labels.rotateRight, "↻"],
          ] as const
        ).map(([direction, label, icon]) => (
          <button
            key={direction}
            type="button"
            className="wau-captcha__button"
            data-variant="outline"
            data-size="icon"
            aria-label={label}
            title={label}
            disabled={!canRotate}
            onClick={() => trackerRef.current?.rotate(direction)}
          >
            <span className="wau-captcha__turn" aria-hidden="true">
              {icon}
            </span>
          </button>
        ))}
        <button
          type="button"
          className="wau-captcha__button"
          data-variant="primary"
          disabled={!answerable || !state?.canFinish}
          aria-busy={checking || undefined}
          onClick={() => trackerRef.current?.done()}
        >
          {checking && <SpinnerIcon />}
          {labels.rotateDone}
        </button>
      </div>
    </>
  );
}
