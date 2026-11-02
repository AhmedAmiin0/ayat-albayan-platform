import type { Glyph, Tone } from '@ab/shared';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { pickLayout } from './dialog-classes';
import { DialogHeader } from './dialog-header';
import { jadwalClass } from '@/components/ui/layout/page';
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
  /**
   * A short confirm with no fields (delete, void, yes / no): on phones it stays a floating card at
   * the top instead of the full-screen sheet that forms get; the centred card from 640px.
   */
  compact?: boolean;
  /**
   * From 640px: `aside` (default) is a full-height panel at the inline-end for forms; `center` the
   * floating card, for wide or visual content (side-by-side comparison, receipt, media picker);
   * `sheet` a bottom sheet on phones (one short editor) and the floating card from 640px.
   */
  layout?: 'aside' | 'center' | 'sheet';
  /** Aside only: a 720px panel instead of 520px, for big two-column forms. */
  wide?: boolean;
}

/**
 * Accessible modal in a jadwal frame on the scrim (docs/07 §6 Dialog): role=dialog, aria-modal,
 * named by its title, focus trapped, Esc closes, focus returns on close. Render it conditionally.
 * On phones (< 640px, owner 2026-10-05) it is a full-screen sheet: the title bar stays on top, the
 * actions are a full-width bar at the bottom (primary on top, above the home indicator) and only
 * the body scrolls between them; `compact` confirms stay a floating card. From `sm` on a form is an
 * aside panel at the inline-end (owner 2026-10-05), `layout="center"` and compact the floating card.
 */
export function Dialog(props: DialogProps) {
  const { title, onClose, children, description, glyph, actions, hint, className } = props;
  const l = pickLayout(props);
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
    <div className={l.overlay}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(jadwalClass, l.panel, className, l.phone)}
      >
        <DialogHeader {...{ title, titleId, descId, onClose, description, glyph }} className={l.header} />
        {/* Taller than the screen: only the body scrolls, title and actions stay in view. */}
        <div className={cn(l.body, !footer && l.bodyAlone)}>
          {children}
        </div>
        {footer && (
          <div data-dialog-footer className={l.footer}>
            <div className={l.hint}>{hint}</div>
            <div className="flex w-full flex-col-reverse gap-2.5 sm:w-auto sm:flex-row [&>*]:max-sm:min-h-11">{actions}</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
