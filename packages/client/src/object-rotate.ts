import type { Challenge, RotateRound } from "./client.js";
import { createButton, createElement } from "./dom.js";
import type { WidgetLabels } from "./labels.js";
import { type RotateTracker, trackRotate } from "./rotate-tracker.js";

export interface ObjectRotateView {
  /** The task, above the frame. */
  task: HTMLParagraphElement;
  /** The frame on screen with the round counter; it takes ArrowLeft, ArrowRight and Enter. */
  stage: HTMLDivElement;
  /** Rotate left, Rotate right and Done. */
  bar: HTMLDivElement;
  /** Shows an object_rotate challenge from round 1. */
  show: (challenge: Challenge) => void;
  setDisabled: (disabled: boolean) => void;
  /** Stops recording the presses. */
  stop: () => void;
}

/** A button that turns the object, an icon with its label for screen readers and as a tooltip. */
function turnButton(label: string, icon: string): HTMLButtonElement {
  const button = createButton("", "outline");
  button.dataset.size = "icon";
  button.setAttribute("aria-label", label);
  button.title = label;
  const glyph = createElement("span", "wau-captcha__turn");
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = icon;
  button.append(glyph);
  return button;
}

/** The object_rotate part of renderWidget. Done on the last round passes every round to onAnswer. */
export function createObjectRotate(labels: WidgetLabels, onAnswer: (rounds: RotateRound[]) => void): ObjectRotateView {
  const task = createElement("p", "wau-captcha__task");
  task.textContent = labels.rotatePrompt;
  const stage = createElement("div", "wau-captcha__rotate");
  const screen = createElement("div", "wau-captcha__rotate-frame");
  screen.tabIndex = 0;
  screen.setAttribute("role", "img");
  screen.setAttribute("aria-label", `${labels.imageAlt}: ${labels.rotatePrompt}`);
  screen.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight Enter");
  const counter = createElement("span", "wau-captcha__round");
  stage.append(screen, counter);
  const bar = createElement("div", "wau-captcha__rotate-bar");
  const leftButton = turnButton(labels.rotateLeft, "↺");
  const rightButton = turnButton(labels.rotateRight, "↻");
  const doneButton = createButton(labels.rotateDone, "primary");
  bar.append(leftButton, rightButton, doneButton);

  let tracker: RotateTracker | undefined;
  let disabled = false;
  let canRotate = false;
  let canFinish = false;
  const updateButtons = () => {
    leftButton.disabled = rightButton.disabled = disabled || !canRotate;
    doneButton.disabled = disabled || !canFinish;
  };
  leftButton.addEventListener("click", () => tracker?.rotate(-1));
  rightButton.addEventListener("click", () => tracker?.rotate(1));
  doneButton.addEventListener("click", () => tracker?.done());
  screen.addEventListener("keydown", (event) => {
    const action = { ArrowLeft: () => tracker?.rotate(-1), ArrowRight: () => tracker?.rotate(1), Enter: () => tracker?.done() }[event.key];
    if (!action) return;
    // Arrows would scroll the page, and Enter submit the form around the widget.
    event.preventDefault();
    // A key held down is one press, not a spin.
    if (!event.repeat && !disabled) action();
  });

  return {
    task,
    stage,
    bar,
    show(challenge) {
      tracker?.stop();
      tracker = undefined;
      if (!challenge.secondImage || !challenge.frameCount) return;
      stage.style.aspectRatio = `${challenge.width} / ${challenge.height}`;
      tracker = trackRotate({
        screen,
        challenge,
        enabled: () => !disabled,
        onChange(state) {
          counter.textContent = `${state.round + 1}/${state.rounds}`;
          canRotate = state.canRotate;
          canFinish = state.canFinish;
          updateButtons();
        },
        onAnswer,
      });
    },
    setDisabled(value) {
      disabled = value;
      updateButtons();
    },
    stop() {
      tracker?.stop();
      tracker = undefined;
    },
  };
}
