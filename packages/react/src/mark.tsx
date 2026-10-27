import { LogoIcon } from "./icons.js";

/** The WAU Captcha mark at the end of a compact box: the app tile of the logo over the name. */
export function Mark() {
  return (
    <span className="wau-captcha__mark">
      <span className="wau-captcha__mark-tile">
        <LogoIcon />
      </span>
      WAU Captcha
    </span>
  );
}
