import { WIDGET_STYLES } from "@waucaptcha-sdk/client";

/**
 * Adds the stylesheet of the widget once per page. React 19 hoists it into <head> and drops
 * the copies by `href`; React 18 keeps one copy next to each captcha, which works the same.
 */
export function CaptchaStyles() {
  return (
    <style href="wau-captcha-react" precedence="default">
      {WIDGET_STYLES}
    </style>
  );
}
