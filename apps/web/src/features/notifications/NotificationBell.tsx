import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { iconButtonClass } from '@/components/ui/icon-button';
import { useDismiss } from '@/components/ui/use-dismiss';
import { usePermissions } from '@/features/auth/use-permissions';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { notificationsQuery } from './api';
import { NotificationPanel } from './NotificationPanel';

/** "9+" past nine: the badge stays one small disc; the exact count is in the button's name. */
export const badgeText = (n: number): string => (n > 9 ? '9+' : String(n));

/**
 * The bell (R-NOT-01) for staff holding notifications.push; renders nothing for anyone else.
 * A non-modal disclosure: the panel drops from the inline end of the button (left in RTL),
 * full-width under the bar on phones; it closes on a pick, a tap outside and Esc, and focus
 * goes back to the bell. The list polls every 30s so the saffron badge stays current.
 */
export function NotificationBell() {
  const allowed = usePermissions().can('notifications.push');
  const list = useQuery({ ...notificationsQuery, enabled: allowed });
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  useDismiss(box, { open, onDismiss: close });
  if (!allowed) return null;
  const unread = list.data?.unread ?? 0;
  return (
    <div ref={box} className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-label={unread > 0 ? t.bell.openUnread.replace('{n}', String(unread)) : t.bell.open}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(iconButtonClass, 'relative text-ink-2', open && 'bg-sunk text-ink')}
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -end-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-act px-1 text-2xs leading-none font-bold text-card tabular-nums ring-2 ring-card"
          >
            {badgeText(unread)}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 top-full z-30 mt-1.5 w-[22rem] overflow-hidden rounded-md border border-rule bg-card text-start shadow-pop max-sm:fixed max-sm:inset-x-2 max-sm:top-16 max-sm:w-auto">
          <NotificationPanel onPick={close} />
        </div>
      )}
    </div>
  );
}
