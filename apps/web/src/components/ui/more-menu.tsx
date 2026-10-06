import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { Icon } from './icon';
import { iconButtonClass } from './icon-button';

/**
 * «⋯ المزيد» (owner, 2026-10-05: one primary action per page head on phones): a plain disclosure
 * that drops the page's secondary actions (its own buttons and links, unchanged) under the button.
 * Closes on a pick, a tap outside and Esc. No ARIA menu roles: the actions stay buttons/links.
 */
export function MoreMenu({ children, label = t.common.more }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (e.target instanceof Node && !box.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${iconButtonClass} border border-rule-strong text-ink`}
      >
        <Icon name="more" />
      </button>
      {/* Always mounted, hidden while closed: an action's own state (a pending export, a dialog
          it opened) outlives the menu closing on the pick. */}
      <div
        hidden={!open}
        onClick={() => setOpen(false)}
        className="absolute end-0 top-full z-30 mt-1.5 grid w-max max-w-[calc(100vw-2rem)] min-w-48 gap-1 rounded-md border border-rule bg-card p-1.5 shadow-pop [&>*]:w-full [&>*]:justify-start [&[hidden]]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
