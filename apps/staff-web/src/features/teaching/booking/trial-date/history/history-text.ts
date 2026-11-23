import { lessonWhenAt, type TrialDateRow, zonedPartsIn } from '@ab/shared';
import { dateLabel } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { Clock } from '@ab/web-kit/lib/clock';

// The viewer reads their own clock (docs/34); the family's is added when it differs; pure.

export interface RowTexts {
  when: string;
  /** Null when the family's zone is the viewer's. */
  family: string | null;
  /** Who picked it and when; unknown for an imported row. */
  picked: string;
}

export interface RowTextInput {
  row: TrialDateRow;
  familyTz: string;
  /** The viewer's zone (useViewerTz()). */
  viewerTz: string;
}

export function rowTexts({ row, familyTz, viewerTz }: RowTextInput, clock: Clock): RowTexts {
  const at = new Date(row.starts_at);
  const familyAt = lessonWhenAt(at, { tz: familyTz, ...clock });
  // Another zone name on the same clock (Asia/Kuwait vs Riyadh) adds nothing.
  const family = familyAt === lessonWhenAt(at, { tz: viewerTz, ...clock }) ? null : t.trialDate.familyTime.replace('{time}', familyAt);
  const on = dateLabel(zonedPartsIn(new Date(row.picked_at), viewerTz).date);
  return {
    // Every time says its zone (docs/07 principle 7).
    when: `${lessonWhenAt(at, { tz: viewerTz, ...clock })} ${t.schedule.viewerTime}`,
    family,
    picked: t.trialDate.pickedAt.replace('{name}', row.picked_by ?? t.trialDate.unknownPicker).replace('{when}', on),
  };
}
