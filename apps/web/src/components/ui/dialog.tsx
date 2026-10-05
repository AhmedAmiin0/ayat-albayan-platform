import type { Glyph, Tone } from '@ab/shared';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Icon } from './icon';
import { IconButton } from './icon-button';
import { NuqtaGlyph } from './nuqta-glyph';
import { jadwalClass } from './page';
import { toneClass } from './status-chip';
import { useFocusTrap } from './use-focus-trap';

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
 * On phones it flows from the top and the actions stack full-width, primary on top.
 */
export function Dialog({ title, onClose, children, description, glyph, actions, hint, className }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(ref, onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 animate-fade-in overflow-y-auto bg-scrim px-3 py-16 sm:grid sm:place-items-center sm:p-6">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(jadwalClass, 'relative mx-auto w-full max-w-[740px] animate-pop-in px-4 pt-5 pb-4 shadow-pop sm:px-7 sm:pt-[26px] sm:pb-[22px]', className)}
      >
        <div
          className={cn(
            'grid items-start gap-x-3.5 gap-y-1',
            // Phones: the glyph tile shares the first row with the close button, the title gets
            // the full width under them (docs/07 §6 Dialog, phone crop).
            'grid-cols-[minmax(0,1fr)_auto]',
            glyph && 'sm:grid-cols-[auto_minmax(0,1fr)_auto]',
          )}
        >
          {glyph && (
            <span
              className={cn(
                'mt-1.5 grid size-10 place-items-center rounded-full max-sm:col-start-1 max-sm:row-start-1',
                toneClass[glyph.tone],
              )}
            >
              <NuqtaGlyph shape={glyph.shape} className="size-[18px]" />
            </span>
          )}
          <h2
            id={titleId}
            className={cn(
              'font-display text-[22px] font-bold leading-normal sm:text-[27px]',
              glyph && 'max-sm:col-span-full max-sm:row-start-2',
            )}
          >
            {title}
          </h2>
          <IconButton
            label={t.common.close}
            data-dialog-close
            onClick={onClose}
            className={cn('mt-0.5', glyph && 'max-sm:col-start-2 max-sm:row-start-1 max-sm:justify-self-end')}
          >
            <Icon name="x" />
          </IconButton>
          {description && (
            <div id={descId} className={cn('col-span-full text-body text-ink-2', glyph && 'sm:col-start-2')}>
              {description}
            </div>
          )}
        </div>
        <div className="mt-5">{children}</div>
        {(actions || hint) && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3.5 border-t border-rule pt-[18px]">
            <div className="max-w-[32ch] text-xs text-ink-3">{hint}</div>
            <div className="flex w-full flex-col-reverse gap-2.5 sm:w-auto sm:flex-row [&>*]:max-sm:min-h-11">{actions}</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
