import { useRef, useState, type ReactNode } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { iconButtonClass } from '@ab/web-kit/components/ui/form/IconButton';
import { useDismiss } from '@ab/web-kit/components/ui/overlay/use-dismiss';

/** Only a click inside the panel's DOM is a pick, since React clicks bubble through portals. */
export function MoreMenu({
  children,
  label = t.common.more,
}: {
  children: ReactNode;
  label?: string;
}) {
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
