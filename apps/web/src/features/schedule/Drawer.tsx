import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { useFocusTrap } from '@/components/ui/use-focus-trap';
import { t } from '@/lib/i18n';

export interface DrawerProps {
  /** Amiri title; also the panel's accessible name. */
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Side panel at the inline-end (the lesson drawer): modal like Dialog (focus trapped, Esc closes,
 * focus returns), full width and full height on phones with the title bar pinned on top while the
 * body (and the action buttons at its end) scrolls under it. Render it conditionally.
 */
export function Drawer({ title, onClose, children }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(ref, onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 animate-fade-in bg-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-y-0 end-0 flex h-dvh w-full max-w-[460px] animate-drawer-in flex-col overflow-y-auto overscroll-contain border-s border-rule bg-card pb-[env(safe-area-inset-bottom)] shadow-pop max-sm:border-s-0 max-sm:shadow-none"
      >
        <div className="sticky top-0 z-20 flex shrink-0 items-start gap-3 border-b border-rule bg-card px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
          <h2 id={titleId} className="min-w-0 flex-1 font-display text-[22px] font-bold leading-normal">
            {title}
          </h2>
          <IconButton label={t.common.close} data-dialog-close onClick={onClose}>
            <Icon name="x" />
          </IconButton>
        </div>
        <div className="grid gap-5 px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
