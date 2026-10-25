import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { usePermissions } from '@/features/auth/use-permissions';
import { notificationsQuery } from '@/features/notifications/api';
import { badgeText } from '@/features/notifications/NotificationBell';
import { NotificationPanel } from '@/features/notifications/NotificationPanel';
import { t } from '@/lib/i18n';

export interface SheetBellProps {
  /** Closes the sheet: a row is a button and its path may differ only in the search. */
  onPick: () => void;
}

/**
 * «الإشعارات» at the top of the «القائمة» sheet (< 900px), for staff holding notifications.push:
 * the unread count, and a tap reveals the bell's panel inline (closed by default).
 */
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
