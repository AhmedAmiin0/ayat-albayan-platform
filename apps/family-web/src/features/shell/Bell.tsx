import { Link } from '@tanstack/react-router';
import { useAlerts } from '@/features/alerts';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** The bell at the top (canvas): the unread badge, «الإشعارات» on a tap. */
export function Bell() {
  const unread = useAlerts().data?.unread ?? 0;
  const label = unread > 0 ? t.bell.openUnread.replace('{n}', String(unread)) : t.bell.open;
  return (
    <Link
      to="/alerts"
      aria-label={label}
      className="relative grid size-11 place-items-center rounded-full text-ink-2 hover:bg-sunk"
    >
      <Icon name="bell" className="size-5" aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute end-1 top-1 grid min-w-5 place-items-center rounded-full bg-danger
            px-1 text-2xs font-semibold text-white tabular-nums"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
