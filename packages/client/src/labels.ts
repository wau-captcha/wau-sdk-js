/** The texts of renderWidget; `labels` replaces any of them. */
export interface WidgetLabels {
  prompt: string;
  verify: string;
  refresh: string;
  loading: string;
  checking: string;
  wrong: string;
  verified: string;
  expired: string;
  failed: string;
  imageAlt: string;
  /** slide_puzzle: the text in the track. */
  slidePrompt: string;
  /** slide_puzzle: the aria-label of the handle. */
  sliderHandle: string;
}

export const DEFAULT_LABELS: WidgetLabels = {
  prompt: "Type the characters you see",
  verify: "Verify",
  refresh: "New challenge",
  loading: "Loading…",
  checking: "Checking…",
  wrong: "That was not right. Try this one.",
  verified: "Verified",
  expired: "The check expired. Please solve a new challenge.",
  failed: "The captcha could not be loaded.",
  imageAlt: "Captcha challenge",
  slidePrompt: "Drag the slider to fit the piece",
  sliderHandle: "Slider",
};
