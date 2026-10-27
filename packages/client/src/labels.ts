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
  /** After too many attempts; {seconds} stands for the seconds to wait. */
  rateLimited: string;
  imageAlt: string;
  /** slide_puzzle: the text in the track. */
  slidePrompt: string;
  /** slide_puzzle: the aria-label of the handle. */
  sliderHandle: string;
  /** animal_jump: the task, under the image. */
  jumpPrompt: string;
  /** animal_jump: the button that plays the round again, and its aria-label. */
  replay: string;
  /** object_rotate: the task, above the image. */
  rotatePrompt: string;
  /** object_rotate: the aria-labels and tooltips of the buttons that turn the object a frame. */
  rotateLeft: string;
  rotateRight: string;
  /** object_rotate: the button that ends a round on the frame on screen. */
  rotateDone: string;
  /** auto_check: the box while it checks the visitor. */
  autoChecking: string;
  /** auto_check: under the challenge it falls back to when the check did not let the visitor through. */
  autoFallback: string;
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
  rateLimited: "Too many attempts. Try again in {seconds} s.",
  imageAlt: "Captcha challenge",
  slidePrompt: "Drag the slider to fit the piece",
  sliderHandle: "Slider",
  jumpPrompt: "Click the animal that jumps highest",
  replay: "Replay",
  rotatePrompt: "Turn the object to face the way the arrow points",
  rotateLeft: "Rotate left",
  rotateRight: "Rotate right",
  rotateDone: "Done",
  autoChecking: "Checking…",
  autoFallback: "One more step: please solve this challenge.",
};

/** The same texts in Vietnamese: pass them as `labels`, or set data-lang="vi" on the element. */
export const VI_LABELS: WidgetLabels = {
  prompt: "Nhập các ký tự bạn thấy",
  verify: "Xác minh",
  refresh: "Thử captcha khác",
  loading: "Đang tải…",
  checking: "Đang kiểm tra…",
  wrong: "Chưa đúng. Hãy thử captcha này.",
  verified: "Đã xác minh",
  expired: "Lượt kiểm tra đã hết hạn. Hãy giải captcha mới.",
  failed: "Không tải được captcha.",
  rateLimited: "Bạn thử quá nhiều lần. Hãy thử lại sau {seconds} giây.",
  imageAlt: "Captcha",
  slidePrompt: "Kéo thanh trượt để ghép mảnh hình",
  sliderHandle: "Thanh trượt",
  jumpPrompt: "Bấm vào con vật nhảy cao nhất",
  replay: "Xem lại",
  rotatePrompt: "Xoay vật thể cho mặt trước hướng theo mũi tên",
  rotateLeft: "Xoay trái",
  rotateRight: "Xoay phải",
  rotateDone: "Xong",
  autoChecking: "Đang kiểm tra…",
  autoFallback: "Cần thêm một bước: hãy giải captcha này.",
};

/** labels.rateLimited with the seconds filled in; a minute when the reply named none. */
export function rateLimitedText(labels: Pick<WidgetLabels, "rateLimited">, retryAfter: number | undefined): string {
  return labels.rateLimited.replace("{seconds}", String(retryAfter ?? 60));
}
