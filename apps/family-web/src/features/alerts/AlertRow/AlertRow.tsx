import { alertTarget } from '@ab/client-core';
import type { PortalKind } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { useClock, dateAndClock, t, cn, Card, useFamilyChatOn } from '@ab/web-kit';
import { alertLink } from '@/features/alerts/alert-link';
import type { FamilyAlerts } from '@/features/alerts/alerts-api';

const DAY = { day: 'numeric', month: 'long' } as const;

interface Props {
  alert: FamilyAlerts['items'][number];
  kind: PortalKind;
  tz: string;
  onRead: (id: string) => void;
}

/** One bell row: unread dot, title, body and time; a tap marks it read and opens its page. */
export function AlertRow({ alert, kind, tz, onRead }: Props) {
  const navigate = useNavigate();
  const clock = useClock();
  const chatOn = useFamilyChatOn();
  const target = alertTarget(alert);
  const when = dateAndClock(new Date(alert.created_at), { ...clock, tz }, DAY);
  const open = () => {
    if (!alert.read_at) onRead(alert.id);
    if (target) void navigate(alertLink(target, { kind, chatOn }));
  };
  const unread = !alert.read_at;
  return (
    <li>
      <Card asChild pressable>
        <button
          type="button"
          onClick={open}
          data-unread={unread || undefined}
          className={cn(
            'relative grid w-full gap-1 p-3 ps-4',
            // Unread: a lapis bar at the inline-start and the title in semibold ink (not a tint
            // alone: a tint gave read vs unread a 1.00:1 contrast); read: the title in ink-2.
            'before:absolute before:inset-y-3 before:start-1 before:w-1 before:rounded-full',
            unread && 'before:bg-lapis',
          )}
        >
          <span
            className={cn(
              'flex items-center gap-2',
              unread ? 'font-semibold text-ink' : 'font-medium text-ink-2',
            )}
          >
            {unread && (
              <span className="size-2 shrink-0 rounded-full bg-lapis" aria-label={t.bell.unread} />
            )}
            {alert.title}
          </span>
          <span className="text-sm text-pretty text-ink-2">{alert.body}</span>
          <span className="text-xs text-ink-3 tabular-nums">{when}</span>
        </button>
      </Card>
    </li>
  );
}
