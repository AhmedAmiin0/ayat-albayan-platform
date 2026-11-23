import { Link } from '@tanstack/react-router';
import { useAlerts } from '#/features/alerts/index.ts';
import { Icon } from '@ab/web-kit/ui';
import { t } from '@ab/web-kit/i18n';

/**
 * The bell at the top (canvas): the unread badge (the solid danger fill and its own foreground:
 * AA in both themes), «الإشعارات» on a tap. The badge pops in when the first unread arrives.
 */
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
