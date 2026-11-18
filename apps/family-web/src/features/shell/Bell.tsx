import { Link } from '@tanstack/react-router';
import { useAlerts } from '@/features/alerts';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/**
 * The bell in the dark header (boards): a 44 px ringed circle, the red unread badge on its corner,
 * «الإشعارات» on a tap; its label carries the count.
 */
export function Bell() {
  const unread = useAlerts().data?.unread ?? 0;
  const label = unread > 0 ? t.bell.openUnread.replace('{n}', String(unread)) : t.bell.open;
  return (
    <Link
      to="/alerts"
      aria-label={label}
      className="relative grid size-11 shrink-0 place-items-center rounded-full border
        border-white/25 bg-white/5 text-white transition-colors hover:bg-white/15
        aria-[current=page]:border-fam-gold/55 aria-[current=page]:bg-fam-gold/12
        aria-[current=page]:text-fam-gold"
    >
      <Icon name="bell" className="size-5" aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -end-[3px] -top-[3px] grid h-5 min-w-5 place-items-center
            rounded-full border-2 border-[#163a2c] bg-[#b91c1c] px-1 font-latin text-2xs
            font-bold text-white tabular-nums"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
