import type { Glyph, Tone } from '@ab/shared';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { DialogHeader } from './dialog-header';
import { jadwalClass } from './page';
import { useFocusTrap } from './use-focus-trap';

/** Phone sheet: fills the screen with no frame; listed last so it beats a caller's `max-w-*`. */
const phoneSheet = 'max-sm:h-dvh max-sm:max-w-none max-sm:animate-fade-up max-sm:rounded-none max-sm:border-0 max-sm:shadow-none';

export interface DialogProps {
  /** Bold title; also the dialog's accessible name. */
  title: string;
  onClose: () => void;
  children: ReactNode;
  description?: ReactNode;
  /** 40px glyph tile before the title, e.g. `{ tone: 'act', shape: 'hollow' }` (duplicate). */
  glyph?: { tone: Tone; shape: Glyph };
  /**
   * Buttons at the inline-end in the order ghost, secondary, primary. They render outside
   * `children`, so a form in the body submits via `<Button type="submit" form={formId}>`.
   */
  actions?: ReactNode;
  /** Short note at the inline-start of the footer. */
  hint?: ReactNode;
  className?: string;
}

/**
 * Accessible modal in a jadwal frame on the scrim (docs/07 §6 Dialog): role=dialog, aria-modal,
 * named by its title, focus trapped, Esc closes, focus returns on close. Render it conditionally.
 * On phones (< 640px, owner 2026-10-05) it is a full-screen sheet: the title bar stays on top, the
 * actions are a full-width bar at the bottom (primary on top, above the home indicator) and only
 * the body scrolls between them. From `sm` on it is the floating card, capped at the viewport.
 */
export function Dialog({ title, onClose, children, description, glyph, actions, hint, className }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const footer = !!(actions || hint);
  useFocusTrap(ref, onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    // Phones (< 640px): a full-screen sheet, no frame; title bar on top, actions bar at the bottom.
    <div className="fixed inset-0 z-50 animate-fade-in bg-scrim sm:grid sm:place-items-center sm:overflow-y-auto sm:p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(jadwalClass, 'relative mx-auto flex w-full max-w-[740px] flex-col shadow-pop sm:max-h-[calc(100dvh-3rem)] sm:animate-pop-in sm:px-7 sm:pt-[26px] sm:pb-[22px]', className, phoneSheet)}
      >
        <DialogHeader {...{ title, titleId, descId, onClose, description, glyph }} />
        {/* Taller than the screen: only the body scrolls, title and actions stay in view. */}
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain max-sm:p-4 sm:-mx-1 sm:mt-5 sm:px-1', !footer && 'max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]')}>
          {children}
        </div>
        {footer && (
          <div data-dialog-footer className="mt-5 flex shrink-0 flex-wrap items-center justify-between gap-x-5 gap-y-3.5 border-t border-rule pt-[18px] max-sm:mt-0 max-sm:gap-y-2.5 max-sm:bg-card max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="max-w-[32ch] text-xs text-ink-3 max-sm:empty:hidden">{hint}</div>
            <div className="flex w-full flex-col-reverse gap-2.5 sm:w-auto sm:flex-row [&>*]:max-sm:min-h-11">{actions}</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
