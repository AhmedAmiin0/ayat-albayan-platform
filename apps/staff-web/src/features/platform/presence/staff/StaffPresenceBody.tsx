import type { StaffPresence, StaffPresenceRow } from '@ab/shared';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import type { Clock } from '@ab/web-kit/lib/clock';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { WithOnline } from '@ab/web-kit/components/channel/presence/presence-pick';
import { StaffPresenceRows } from './StaffPresenceRows';

const NOTE = 'text-sm text-ink-3';

interface Props {
  query: { data: StaffPresence | undefined; isPending: boolean; isError: boolean };
  rows: readonly WithOnline<StaffPresenceRow>[];
  clock: Clock & { now: Date };
}

export function StaffPresenceBody({ query, rows, clock }: Props) {
  const p = t.presence;
  if (query.isPending) return <ListSkeleton rows={3} />;
  if (query.isError || !query.data) {
    return (
      <p role="alert" className="text-sm text-danger">
        {p.loadError}
      </p>
    );
  }
  if (!query.data.enabled) return <p className={NOTE}>{p.off}</p>;
  if (rows.length === 0) return <p className={NOTE}>{p.staffEmpty}</p>;
  return <StaffPresenceRows rows={rows} clock={clock} />;
}
