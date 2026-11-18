import { alertTarget } from '@ab/client-core';
import type { PortalKind } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { IconTile } from '@ab/web-kit/components/family/layout/IconTile';
import { useClock } from '@ab/web-kit/lib/clock';
import { dateAndClock } from '@ab/web-kit/lib/clock-text';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { useFamilyChatOn } from '@ab/web-kit/portal/use-family-chat';
import { alertLink } from './alert-link';
import { alertTile } from './alert-look';
import type { FamilyAlerts } from './alerts-api';

const DAY = { day: 'numeric', month: 'long' } as const;

interface Props {
  alert: FamilyAlerts['items'][number];
  kind: PortalKind;
  tz: string;
  onRead: (id: string) => void;
}

/**
 * One bell row (boards: PortalWebAlerts): the icon tile, title, body, time and the unread dot; a
 * tap marks it read and opens its page. Read rows sit on the cream wash.
 */
export function AlertRow({ alert, kind, tz, onRead }: Props) {
  const navigate = useNavigate();
  const clock = useClock();
  const chatOn = useFamilyChatOn();
  const target = alertTarget(alert);
  const tile = alertTile(target);
  const when = dateAndClock(new Date(alert.created_at), { ...clock, tz }, DAY);
  const open = () => {
    if (!alert.read_at) onRead(alert.id);
    if (target) void navigate(alertLink(target, { kind, chatOn }));
  };
  return (
    <li>
      <button type="button" onClick={open} className={cn('flex w-full flex-wrap items-center',
        'gap-x-4 gap-y-2 px-4 py-4 text-start transition-colors hover:bg-sunk sm:px-6',
        alert.read_at ? 'bg-sunk/60' : 'bg-raised')}>
        <IconTile icon={tile.icon} tone={tile.tone} />
        <span className="grid min-w-[10rem] flex-1 gap-0.5">
          <span className={cn('text-body text-ink', alert.read_at ? 'font-semibold'
            : 'font-extrabold')}>
            {alert.title}
          </span>
          <span className="text-sm text-pretty text-ink-3">{alert.body}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-3 tabular-nums">
          <Icon name="clock" className="size-4" />
          {when}
        </span>
        <span className="inline-flex w-4 justify-center">
          {!alert.read_at && (
            <span className="size-2.5 rounded-full bg-lapis ring-4 ring-fam-mint"
              aria-label={t.bell.unread} />
          )}
        </span>
        <Icon name="chevron-left" className="size-4 text-ink-3" />
      </button>
    </li>
  );
}
