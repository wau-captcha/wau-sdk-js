import { DEFAULT_LABELS as DEFAULT_WIDGET_LABELS, type WidgetLabels } from "@wau-captcha/client";

/** The texts of <WauCaptcha />; loading and checking show as spinners, so they have none. */
export type WauCaptchaLabels = Omit<WidgetLabels, "loading" | "checking"> & {
  /** The button that opens the dialog in MODAL mode, and the title of the dialog. */
  open: string;
  /** The close button of the dialog. */
  close: string;
};

const { loading, checking, ...widgetLabels } = DEFAULT_WIDGET_LABELS;

export const DEFAULT_LABELS: WauCaptchaLabels = {
  ...widgetLabels,
  open: "Verify you are human",
  close: "Close",
};
