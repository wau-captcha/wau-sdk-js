import type { ChallengeType } from "./constants.js";
import { renderWidget, type WidgetHandle } from "./widget.js";

/**
 * Renders a widget into every element carrying data-wau-captcha, reading its options from
 * data attributes: data-site-key, data-base-url and optionally data-challenge-type and
 * data-input-name. Elements already rendered are skipped.
 */
export function autoRender(scope: ParentNode = document): WidgetHandle[] {
  const handles: WidgetHandle[] = [];
  scope.querySelectorAll<HTMLElement>("[data-wau-captcha]").forEach((host) => {
    if (host.dataset.wauCaptchaRendered) return;
    host.dataset.wauCaptchaRendered = "true";
    handles.push(
      renderWidget(host, {
        siteKey: host.dataset.siteKey ?? "",
        baseUrl: host.dataset.baseUrl ?? "",
        challengeType: host.dataset.challengeType as ChallengeType | undefined,
        inputName: host.dataset.inputName,
      }),
    );
  });
  return handles;
}
