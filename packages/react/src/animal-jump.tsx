import { type Challenge, type JumpClick, type JumpState, type JumpTracker, trackJump } from "@wau-captcha/client";
import { useEffect, useRef, useState } from "react";
import { SpinnerIcon } from "./icons.js";
import type { WauCaptchaLabels } from "./labels.js";

export type AnimalJumpProps = {
  /** null while a challenge loads: a placeholder holds the place of the image and Replay is disabled. */
  challenge: Challenge | null;
  /** Width / height of the placeholder. */
  aspectRatio: string;
  answerable: boolean;
  checking: boolean;
  labels: WauCaptchaLabels;
  onAnswer: (clicks: JumpClick[]) => void;
};

/** A share of `whole` as a CSS percentage, so the ring stays on the click as the image scales. */
const percent = (part: number, whole: number) => `${(part / whole) * 100}%`;

/**
 * The animal_jump challenge: its rounds one after the other with the round counter, and the task
 * with the Replay button. Give it a new `key` for each challenge, so that it starts again at round 1.
 */
export function AnimalJump({ challenge, aspectRatio, answerable, checking, labels, onAnswer }: AnimalJumpProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<JumpTracker | null>(null);
  const [state, setState] = useState<JumpState | null>(null);
  // The latest props, so that the parent rendering again does not restart the round.
  const latestRef = useRef({ answerable, onAnswer });
  useEffect(() => {
    latestRef.current = { answerable, onAnswer };
  });

  useEffect(() => {
    const screen = screenRef.current;
    if (!challenge?.secondImage || !screen) return;
    const tracker = trackJump({
      screen,
      challenge,
      imageAlt: labels.imageAlt,
      enabled: () => latestRef.current.answerable,
      onChange: setState,
      onAnswer: (clicks) => latestRef.current.onAnswer(clicks),
    });
    trackerRef.current = tracker;
    return () => {
      tracker.stop();
      trackerRef.current = null;
    };
  }, [challenge, labels.imageAlt]);

  const mark = state?.mark;
  return (
    <>
      {challenge?.secondImage ? (
        <div className="wau-captcha__jump" style={{ aspectRatio: `${challenge.width} / ${challenge.height}` }}>
          <div ref={screenRef} className="wau-captcha__jump-screen" />
          {state && <span className="wau-captcha__round">{`${state.round + 1}/${state.rounds}`}</span>}
          {mark && <span className="wau-captcha__ring" style={{ left: percent(mark.x, challenge.width), top: percent(mark.y, challenge.height) }} />}
        </div>
      ) : (
        <div className="wau-captcha__image" style={{ aspectRatio }} />
      )}
      <div className="wau-captcha__jump-bar">
        <span>{labels.jumpPrompt}</span>
        <button
          type="button"
          className="wau-captcha__button"
          data-variant="outline"
          data-size="sm"
          aria-label={labels.replay}
          disabled={!answerable || !state?.canReplay}
          aria-busy={checking || undefined}
          onClick={() => trackerRef.current?.replay()}
        >
          {checking ? <SpinnerIcon /> : <span aria-hidden="true">↻</span>}
          {labels.replay}
        </button>
      </div>
    </>
  );
}
