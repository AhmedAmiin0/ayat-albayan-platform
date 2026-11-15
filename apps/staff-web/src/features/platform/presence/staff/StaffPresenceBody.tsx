import type { StaffPresence, StaffPresenceRow } from '@ab/shared';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import type { Clock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import type { WithOnline } from '@/features/platform/presence/presence-pick';
import { StaffPresenceRows } from './StaffPresenceRows';

const NOTE = 'text-sm text-ink-3';

interface Props {
  query: { data: StaffPresence | undefined; isPending: boolean; isError: boolean };
  rows: readonly WithOnline<StaffPresenceRow>[];
  clock: Clock & { now: Date };
}

/** The opened panel: loading, the error, «متوقف» (presence_enabled off), empty, or the rows. */
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
