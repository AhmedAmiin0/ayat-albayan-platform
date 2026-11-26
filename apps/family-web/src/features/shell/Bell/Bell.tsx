import { Link } from '@tanstack/react-router';
import { useAlerts } from '@/features/alerts';
import { Icon, t } from '@ab/web-kit';

/** The badge uses the solid danger fill with its own foreground for AA in both themes. */
export function Bell() {
  const unread = useAlerts().data?.unread ?? 0;
  const label = unread > 0 ? t.bell.openUnread.replace('{n}', String(unread)) : t.bell.open;
  return (
    <Link
      to="/alerts"
      aria-label={label}
      className="ab-press relative grid size-11 place-items-center rounded-full text-ink-2
        hover:bg-sunk aria-[current=page]:bg-accent aria-[current=page]:text-lapis"
    >
      <Icon name="bell" className="size-5" aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute end-0 top-0 grid min-w-5 animate-pop-in place-items-center
            rounded-full bg-destructive-solid px-1 text-2xs font-semibold
            text-destructive-foreground tabular-nums"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
