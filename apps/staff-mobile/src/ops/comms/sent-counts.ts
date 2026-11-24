import type { AudienceTab, NotificationAudience, NotificationEntryView } from '@ab/shared';
import { audienceTabs, rowsOf } from '@/ops/notif-rules/lib/audience-tabs';
import { nameOf } from '@/ops/notif-rules/lib/rule-words';

// State is the API's per-row `state`; manual rows are sent by a person, so they are left out.

export interface SentRow {
  audience: NotificationAudience;
  label: string;
  on: number;
  off: number;
}

const isAudience = (value: AudienceTab): value is NotificationAudience => value !== 'manual';

/** One row per audience, in the pills' order; rows this build has no name for are not counted (the list hides them). */
export function sentCounts(entries: readonly NotificationEntryView[]): SentRow[] {
  const known = entries.filter((e) => nameOf(e.key) !== null);
  return audienceTabs(known).flatMap(({ value, label }) => {
    if (!isAudience(value)) return [];
    const rows = rowsOf(known, value);
    const on = rows.filter((e) => e.state === 'on').length;
    return [{ audience: value, label, on, off: rows.length - on }];
  });
}
