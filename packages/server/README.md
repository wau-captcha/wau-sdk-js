# @wau-captcha/server

Node.js SDK of [WAU Captcha](https://waucaptcha.com): redeem the tokens your frontend obtained,
with your secret key. Node.js 18 or later, no dependencies.

```bash
npm install @wau-captcha/server
```

```js
import { BehaviorVerdict, WauCaptchaServer } from "@wau-captcha/server";

const wau = new WauCaptchaServer({
  secretKey: process.env.WAU_SECRET_KEY,
  baseUrl: "https://api.waucaptcha.com",
});

const result = await wau.verifyToken(token);
if (!result.success) {
  // unknown, expired, already used, or issued for another key
} else {
  result.challengeType; // "image_distort", "motion_noise", "slide_puzzle" or "animal_jump"
  result.hostname; // the website the challenge was solved on: compare it with yours
  result.behavior; // { verdict, score, reasons }: refuse not_measured, decide about suspicious
}
```

The token is sent in the body of `POST /siteverify`, never in the URL. `baseUrl` must be https;
plain http is accepted for `localhost`, `127.0.0.1` and `[::1]` only. A thrown `WauCaptchaError`
means the token could not be checked: treat it as a failure (`error.code`, and
`error.retryAfter` with `ErrorCode.RATE_LIMITED`).

Documentation: https://waucaptcha.com/docs · Changes: [CHANGELOG.md](https://github.com/wau-captcha/wau-sdk-js/blob/main/CHANGELOG.md) · License: MIT
