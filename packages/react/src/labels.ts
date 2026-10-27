import { DEFAULT_LABELS as DEFAULT_WIDGET_LABELS, VI_LABELS as VI_WIDGET_LABELS, type WidgetLabels } from "@waucaptcha-sdk/client";

/** The texts of <WauCaptcha />; loading and checking show as spinners, so they have none. */
export type WauCaptchaLabels = Omit<WidgetLabels, "loading" | "checking"> & {
  /** MODAL mode: beside the checkbox that opens the dialog. */
  notRobot: string;
  /** MODAL mode: the title of the dialog. */
  open: string;
  /** The close button of the dialog. */
  close: string;
};

function withoutSpinnerTexts({ loading: _loading, checking: _checking, ...labels }: WidgetLabels) {
  return labels;
}

export const DEFAULT_LABELS: WauCaptchaLabels = {
  ...withoutSpinnerTexts(DEFAULT_WIDGET_LABELS),
  notRobot: "I'm not a robot",
  open: "Verify you are human",
  close: "Close",
};

/** The same texts in Vietnamese, for the labels prop. */
export const VI_LABELS: WauCaptchaLabels = {
  ...withoutSpinnerTexts(VI_WIDGET_LABELS),
  notRobot: "Tôi không phải robot",
  open: "Xác minh bạn là người",
  close: "Đóng",
};
