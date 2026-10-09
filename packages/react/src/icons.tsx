/** A 16px stroke icon in the current text color, hidden from assistive technology. */
function Icon({ path, className = "wau-captcha__icon" }: { path: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export const ArrowRightIcon = () => <Icon path="M5 12h14M13 6l6 6-6 6" />;
export const CheckIcon = () => <Icon path="M20 6 9 17l-5-5" />;
export const CloseIcon = () => <Icon path="M18 6 6 18M6 6l12 12" />;
export const RefreshIcon = () => <Icon path="M20 12a8 8 0 1 1-2.34-5.66L20 9M20 4v5h-5" />;
export const ShieldIcon = () => <Icon path="M12 21s7-3.5 7-9V5.5L12 3 5 5.5V12c0 5.5 7 9 7 9z" />;
export const SpinnerIcon = () => <Icon path="M21 12a9 9 0 1 1-9-9" className="wau-captcha__icon wau-captcha__spinner" />;
