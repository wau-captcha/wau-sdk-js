/** How <WauCaptcha /> shows the challenge: INLINE in place, MODAL in a dialog opened from a checkbox. */
export const WauCaptchaMode = {
  INLINE: "inline",
  MODAL: "modal",
} as const;

export type WauCaptchaMode = (typeof WauCaptchaMode)[keyof typeof WauCaptchaMode];

/** AUTO follows the color-scheme of the page; LIGHT and DARK force one. */
export const WauCaptchaTheme = {
  AUTO: "auto",
  LIGHT: "light",
  DARK: "dark",
} as const;

export type WauCaptchaTheme = (typeof WauCaptchaTheme)[keyof typeof WauCaptchaTheme];
