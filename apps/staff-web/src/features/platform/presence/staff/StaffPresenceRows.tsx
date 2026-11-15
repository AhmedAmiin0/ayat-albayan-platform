import { presenceLine, type StaffPresenceRow } from '@ab/shared';
import { viewerZone } from '@/lib/clock-text';
import { t } from '@/lib/i18n/i18n';
import type { Clock } from '@/lib/clock';
import { PresenceStatus } from '@/features/platform/presence/PresenceStatus';
import type { WithOnline } from '@/features/platform/presence/presence-pick';

interface Props {
  /** Already in presence order (online first, then the newest last seen). */
  rows: readonly WithOnline<StaffPresenceRow>[];
  clock: Clock & { now: Date };
}

/** One line per staff login: name, role, then «متصل الآن» / «آخر ظهور …» / «لم يظهر بعد». */
export function StaffPresenceRows({ rows, clock }: Props) {
  const at = { ...clock, tz: viewerZone(), words: t.presence };
  return (
    <ul className="grid max-h-64 gap-1 overflow-y-auto">
      {rows.map((row) => (
        <li key={row.profile_id} className="flex min-w-0 items-center gap-2 py-1 text-sm">
          <span className="min-w-0 truncate font-semibold">{row.name}</span>
          <span className="shrink-0 text-2xs text-ink-3">{t.activity.roles[row.role]}</span>
          <PresenceStatus
            className="ms-auto shrink-0"
            online={row.online}
            text={
              presenceLine({ ...at, online: row.online, lastSeenAt: row.last_seen_at }) ||
              t.presence.staffNever
            }
          />
        </li>
      ))}
    </ul>
  );
}
