import { type ReactNode, useEffect, useRef } from "react";
import { CloseIcon } from "./icons.js";

export type CaptchaDialogProps = {
  open: boolean;
  /** Called on the close button, Escape and a click on the backdrop. */
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
};

/**
 * A native modal <dialog>: the browser traps the focus, closes it on Escape and gives the
 * focus back to the button that opened it. The first text box gets the focus on open.
 */
export function CaptchaDialog({ open, onClose, title, closeLabel, children }: CaptchaDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialogRef.current;
    if (!element || element.open === open) return;
    if (!open) return element.close();
    element.showModal();
    element.querySelector("input")?.focus();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="wau-captcha__dialog"
      aria-label={title}
      onClose={onClose}
      // The body fills the dialog, so a click on the dialog itself is a click on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="wau-captcha__dialog-body">
        <p className="wau-captcha__dialog-header">
          {title}
          <button
            type="button"
            className="wau-captcha__button"
            data-variant="ghost"
            data-size="icon-sm"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </p>
        {children}
      </div>
    </dialog>
  );
}
