import { type Challenge, type SlideDrag, trackSlide } from "@waucaptcha-sdk/client";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, SpinnerIcon } from "./icons.js";
import type { WauCaptchaLabels } from "./labels.js";

export type SlidePuzzleProps = {
  /** null while a challenge loads: a placeholder holds the place of the image and the handle is disabled. */
  challenge: Challenge | null;
  /** Width / height of the placeholder. */
  aspectRatio: string;
  answerable: boolean;
  checking: boolean;
  labels: WauCaptchaLabels;
  onDrag: (drag: SlideDrag) => void;
};

/** A share of `whole` as a CSS percentage, so the piece and the handle scale with the image. */
const percent = (part: number, whole: number) => `${(part / whole) * 100}%`;

/**
 * The slide_puzzle challenge: the piece over its background, and the track whose handle drags it.
 * Give it a new `key` for each challenge, so that the piece starts again at x = 0.
 */
export function SlidePuzzle({ challenge, aspectRatio, answerable, checking, labels, onDrag }: SlidePuzzleProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const [x, setX] = useState(0);
  // The latest onDrag, so that the parent rendering again in the middle of a drag does not restart it.
  const onDragRef = useRef(onDrag);
  useEffect(() => {
    onDragRef.current = onDrag;
  });

  useEffect(() => {
    const image = imageRef.current;
    const handle = handleRef.current;
    if (!challenge?.piece || !image || !handle) return;
    return trackSlide({ handle, image, challenge, onMove: setX, onRelease: (drag) => onDragRef.current(drag) });
  }, [challenge]);

  const piece = challenge?.piece;
  return (
    <>
      {challenge && piece ? (
        <div className="wau-captcha__puzzle">
          <img
            ref={imageRef}
            className="wau-captcha__image"
            src={challenge.imageUrl}
            width={challenge.width}
            height={challenge.height}
            alt={labels.imageAlt}
            draggable={false}
          />
          <img
            className="wau-captcha__piece"
            src={piece.imageUrl}
            alt=""
            draggable={false}
            style={{ left: percent(x, challenge.width), top: percent(piece.y, challenge.height), width: percent(piece.width, challenge.width) }}
          />
        </div>
      ) : (
        <div className="wau-captcha__image" style={{ aspectRatio }} />
      )}
      <div className="wau-captcha__track">
        <span className="wau-captcha__track-label">{labels.slidePrompt}</span>
        <button
          ref={handleRef}
          type="button"
          className="wau-captcha__handle"
          aria-label={labels.sliderHandle}
          disabled={!answerable}
          aria-busy={checking || undefined}
          style={challenge && piece ? { left: percent(x, challenge.width), width: percent(piece.width, challenge.width) } : undefined}
        >
          {checking ? <SpinnerIcon /> : <ArrowRightIcon />}
        </button>
      </div>
    </>
  );
}
