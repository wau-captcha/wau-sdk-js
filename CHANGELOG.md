# Changelog

Every release of the three packages, newest first. Versions follow [Semantic Versioning](https://semver.org/).

## @wau-captcha/client 1.5.0

- A new challenge type, `ChallengeType.OBJECT_ROTATE` (`object_rotate`): in each of two rounds an object stands beside
  an arrow on the ground, and the person turns it a frame at a time until it faces the arrow, then presses Done. The
  widget shows the task above the image, a `1/2`, `2/2` counter, and Rotate left (↺), Rotate right (↻) and Done; on
  the focused image ArrowLeft and ArrowRight turn the object and Enter is Done. Done waits for a first press, presses
  past 24 a round are ignored, and nothing is said between the rounds. It works with a pointer or the keyboard, and
  the key presses count in the behaviour data; it needs sight.
- `Challenge.frameCount` (from `frame_count`): `imageUrl` and `secondImage` are each a strip of that many frames side
  by side. `verifyRotate(challengeId, rounds, options)` with the `RotateRound` and `RotatePress` types, and
  `trackRotate`, which shows the frames and records the presses for your own UI.
- New labels `rotatePrompt`, `rotateLeft`, `rotateRight` and `rotateDone`, in English (`DEFAULT_LABELS`) and
  Vietnamese (`VI_LABELS`).
- `recordBehavior`'s `input` takes any element whose key presses are timed, not only an `<input>`.

## @wau-captcha/server 1.5.0

- `ChallengeType.OBJECT_ROTATE`: `verifyToken` returns `challengeType: "object_rotate"` for the tokens of that type.

## @wau-captcha/react 1.4.0

- Depends on `@wau-captcha/client` ^1.5.0. `<WauCaptcha challengeType={ChallengeType.OBJECT_ROTATE} />` shows the two
  rounds with Rotate left, Rotate right and Done, which turns into the spinner while the answer is checked. The labels
  gain `rotatePrompt`, `rotateLeft`, `rotateRight` and `rotateDone`.

## @wau-captcha/client 1.4.0

- A new challenge type, `ChallengeType.ANIMAL_JUMP` (`animal_jump`): two rounds of 2 s in which five animal heads jump;
  in each, the person clicks the one that jumps highest. The widget plays each round once with a `1/2`, `2/2` counter
  and a Replay button (three replays a round), marks each click with a ring for 250 ms and submits both clicks after
  round 2. Nothing is said between the rounds, so a script cannot learn which one it got wrong. Like `SLIDE_PUZZLE` it
  needs a pointer: where accessibility matters, keep `IMAGE_DISTORT` available.
- `Challenge.secondImage` (round 2; `imageUrl` is round 1), `verifyJump(challengeId, clicks, options)` with the
  `JumpClick` type, and `trackJump`, which plays the rounds and records the clicks for your own UI.
- New labels `jumpPrompt` and `replay`, in English (`DEFAULT_LABELS`) and Vietnamese (`VI_LABELS`).
- Each playback of a round is a `blob:` object URL, so that every browser starts it from the first frame: a
  Content-Security-Policy that limits `img-src` must allow `blob:` as well as `data:`.

## @wau-captcha/server 1.4.0

- `ChallengeType.ANIMAL_JUMP`: `verifyToken` returns `challengeType: "animal_jump"` for the tokens of that type.

## @wau-captcha/react 1.3.0

- Depends on `@wau-captcha/client` ^1.4.0. `<WauCaptcha challengeType={ChallengeType.ANIMAL_JUMP} />` shows the two
  rounds with the Replay button, which turns into the spinner while the answer is checked. The labels gain `jumpPrompt`
  and `replay`.

## @wau-captcha/client 1.3.0

- Sends the site key with every answer (`site_key`): an answer only counts for the key whose challenge it solves.
- Solves the proof of work of each challenge (`pow_salt`, `pow_difficulty` of `/challenge/new`) and sends it as
  `pow_nonce`. It starts as soon as `newChallenge` returns and runs in slices of a few milliseconds, so the page stays
  responsive; at the default difficulty of 15 it took 37 ms (median) in desktop Chrome and 162 ms (median, 573 ms at
  worst) with the CPU throttled four times, like a mid-range phone. Answers from older clients go without it and are
  judged at most `suspicious`. New exports: `sha256`, `solvePow`, `leadingZeroBits`, and `pow` on
  `Challenge`; `VerifyOptions.powNonce` for challenges fetched without `newChallenge`.
- Behaviour data carries three hints about the browser: `headless_ua`, `no_languages` and
  `chrome_without_window_chrome` (Android WebView is left out of the last). They only lower the score.
- New error codes: `DOMAIN_NOT_ALLOWED` (the website is not in the allowed domains of the key), `BEHAVIOR_REQUIRED`
  (the key requires behaviour data), `CHALLENGE_ID_INVALID`, `PAYLOAD_TOO_LARGE` and `INTERNAL`.
- `baseUrl` must be https; plain http is accepted for `localhost`, `127.0.0.1` and `[::1]` only. Anything else throws a
  `TypeError`.
- `WauCaptchaError.retryAfter` gives the seconds a `RATE_LIMITED` reply asks to wait, from its metadata or its
  `Retry-After` header. The widget says "Too many attempts. Try again in N s." instead of a bare error code.
- Vietnamese texts: `VI_LABELS`, or `data-lang="vi"` on the element the `<script>` build renders.
- Published from GitHub Actions with npm provenance; `node scripts/sri.mjs <version>` prints the integrity hash of the
  `<script>` build.

## @wau-captcha/server 1.3.0

- Sends the token in the JSON body of `POST /siteverify` instead of the query string, so it stays out of access logs.
  The service still accepts the query string from 1.2.0 and earlier.
- `hostname` on a successful result: the host name of the website the challenge was solved on. Compare it with your own
  domain; a script outside a browser can forge it.
- `baseUrl` must be https; plain http is accepted for `localhost`, `127.0.0.1` and `[::1]` only.
- `WauCaptchaError.retryAfter` with `RATE_LIMITED`; new error codes `PAYLOAD_TOO_LARGE` and `INTERNAL`.
- `BehaviorVerdict` documents what to do with each verdict: refuse `not_measured` (the client sent no behaviour data),
  decide about `suspicious` per form and refuse it for sign-up and login.
- Published from GitHub Actions with npm provenance.

## @wau-captcha/react 1.2.0

- Depends on `@wau-captcha/client` ^1.3.0, so `<WauCaptcha />` sends the site key, the proof of work and the browser
  hints without any change on your side.
- Exports `DEFAULT_LABELS` and `VI_LABELS` (Vietnamese texts); a `RATE_LIMITED` reply shows how many seconds to wait.
- Published from GitHub Actions with npm provenance.

## Earlier releases

This file starts with the releases above. Before them, @wau-captcha/client and @wau-captcha/server 1.2.0 added the
behaviour check (`recordBehavior`, the `behavior` of `verifyToken`), and earlier versions added slide_puzzle.
