import type { Challenge, JumpClick } from "./client.js";
import { createButton, createElement } from "./dom.js";
import { type JumpTracker, trackJump } from "./jump-tracker.js";
import type { WidgetLabels } from "./labels.js";

export interface AnimalJumpView {
  /** The round playing, with the round counter and the ring that marks a click. */
  stage: HTMLDivElement;
  /** The task and the Replay button. */
  bar: HTMLDivElement;
  /** Shows an animal_jump challenge from round 1. */
  show: (challenge: Challenge) => void;
  setDisabled: (disabled: boolean) => void;
  /** Stops the playback and frees its images. */
  stop: () => void;
}

/** A share of `whole` as a CSS percentage, so the ring stays on the click as the image scales. */
function percent(part: number, whole: number): string {
  return `${(part / whole) * 100}%`;
}

/** The animal_jump part of renderWidget. The click on the last round passes every click to onAnswer. */
export function createAnimalJump(labels: WidgetLabels, onAnswer: (clicks: JumpClick[]) => void): AnimalJumpView {
  const stage = createElement("div", "wau-captcha__jump");
  const screen = createElement("div", "wau-captcha__jump-screen");
  const counter = createElement("span", "wau-captcha__round");
  const ring = createElement("span", "wau-captcha__ring");
  ring.hidden = true;
  stage.append(screen, counter, ring);
  const bar = createElement("div", "wau-captcha__jump-bar");
  const prompt = createElement("span");
  prompt.textContent = labels.jumpPrompt;
  const replayButton = createButton(labels.replay, "outline");
  replayButton.dataset.size = "sm";
  replayButton.setAttribute("aria-label", labels.replay);
  const icon = createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "↻";
  replayButton.prepend(icon);
  bar.append(prompt, replayButton);

  let tracker: JumpTracker | undefined;
  let disabled = false;
  let canReplay = false;
  const updateReplay = () => {
    replayButton.disabled = disabled || !canReplay;
  };
  replayButton.addEventListener("click", () => tracker?.replay());

  return {
    stage,
    bar,
    show(challenge) {
      tracker?.stop();
      tracker = undefined;
      if (!challenge.secondImage) return;
      const { width, height } = challenge;
      stage.style.aspectRatio = `${width} / ${height}`;
      tracker = trackJump({
        screen,
        challenge,
        imageAlt: labels.imageAlt,
        enabled: () => !disabled,
        onChange(state) {
          counter.textContent = `${state.round + 1}/${state.rounds}`;
          ring.hidden = !state.mark;
          if (state.mark) {
            ring.style.left = percent(state.mark.x, width);
            ring.style.top = percent(state.mark.y, height);
          }
          canReplay = state.canReplay;
          updateReplay();
        },
        onAnswer,
      });
    },
    setDisabled(value) {
      disabled = value;
      updateReplay();
    },
    stop() {
      tracker?.stop();
      tracker = undefined;
    },
  };
}
