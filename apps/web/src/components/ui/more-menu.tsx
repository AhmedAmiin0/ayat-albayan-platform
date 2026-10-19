import { useRef, useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { Icon } from './icon';
import { iconButtonClass } from './icon-button';
import { useDismiss } from './use-dismiss';

/**
 * «⋯ المزيد» (owner, 2026-10-05: one primary action per page head on phones): a plain disclosure
 * that drops the page's secondary actions (its own buttons and links, unchanged) under the button.
 * Closes on a pick, a tap outside and Esc. No ARIA menu roles: the actions stay buttons/links.
 * A pick and Esc put focus back on the trigger (a pick first, so a dialog it opens records the
 * trigger, not an entry about to be hidden, and returns focus there on close). Only a click whose
 * DOM target is inside the panel counts as a pick: React clicks bubble through portals, so a click
 * in a dialog an entry opened must not close the menu or pull focus out of the dialog.
 */
export function MoreMenu({ children, label = t.common.more }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = () => {
    trigger.current?.focus();
    setOpen(false);
  };
  useDismiss(box, { open, onDismiss: (how) => (how === 'escape' ? close() : setOpen(false)) });
  return (
    <div ref={box} className="relative">
      <button
        ref={trigger}
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
        ref={panel}
        hidden={!open}
        onClick={(e) => {
          if (panel.current?.contains(e.target as Node)) close();
        }}
        className="absolute end-0 top-full z-30 mt-1.5 grid w-max max-w-[calc(100vw-2rem)] min-w-48 gap-1 rounded-md border border-rule bg-card p-1.5 shadow-pop [&>*]:w-full [&>*]:justify-start [&[hidden]]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
