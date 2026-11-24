import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { usePermissions } from '@ab/web-kit/auth/use-permissions';
import { notificationsQuery } from '@ab/web-kit/push/notifications-api';
import { badgeText } from '@/features/messaging/notifications/NotificationBell';
import { NotificationPanel } from '@/features/messaging/notifications/NotificationPanel';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface SheetBellProps {
  /** Closes the sheet: a row is a button and its path may differ only in the search. */
  onPick: () => void;
}

/** Only for staff with notifications.push; the panel is closed by default. */
export function SheetBell({ onPick }: SheetBellProps) {
  const allowed = usePermissions().can('notifications.push');
  const unread = useQuery({ ...notificationsQuery, enabled: allowed }).data?.unread ?? 0;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (!allowed) return null;
  return (
    <div className="mb-4 grid overflow-hidden rounded-md border border-rule">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread > 0 ? t.bell.openUnread.replace('{n}', String(unread)) : t.bell.open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 items-center gap-2.5 px-3 text-start text-sm font-semibold text-ink hover:bg-sunk"
      >
        <Icon name="bell" />
        <span className="flex-1">{t.bell.title}</span>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="grid h-5 min-w-5 place-items-center rounded-full bg-act px-1.5 text-2xs font-bold text-card tabular-nums"
          >
            {badgeText(unread)}
          </span>
        )}
      </button>
      <div id={panelId} hidden={!open} className="border-t border-rule">
        {open && <NotificationPanel onPick={onPick} />}
      </div>
    </div>
  );
}
