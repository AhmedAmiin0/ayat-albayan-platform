import { alertTarget } from '@ab/client-core';
import type { PortalKind } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { useClock } from '@ab/web-kit/lib/clock';
import { dateAndClock } from '@ab/web-kit/lib/clock-text';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { useFamilyChatOn } from '@ab/web-kit/portal/use-family-chat';
import { alertLink } from './alert-link';
import type { FamilyAlerts } from './alerts-api';

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
  return (
    <li>
      <button
        type="button"
        onClick={open}
        className={cn(
          'grid w-full gap-1 rounded-lg border border-rule p-3 text-start hover:bg-sunk',
          alert.read_at ? 'bg-page' : 'bg-raised',
        )}
      >
        <span className="flex items-center gap-2 font-semibold text-ink">
          {!alert.read_at && (
            <span className="size-2 rounded-full bg-lapis" aria-label={t.bell.unread} />
          )}
          {alert.title}
        </span>
        <span className="text-sm text-pretty text-ink-2">{alert.body}</span>
        <span className="text-xs text-ink-3 tabular-nums">
          {when}
        </span>
      </button>
    </li>
  );
}
