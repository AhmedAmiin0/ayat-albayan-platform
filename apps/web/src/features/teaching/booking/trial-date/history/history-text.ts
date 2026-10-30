import { viewerTz as currentViewerTz } from '@ab/client-core';
import { lessonWhenAt, type TrialDateRow } from '@ab/shared';
import { dateLabel, zonedParts } from '@/features/teaching/schedule/tz';
import { t } from '@/lib/i18n/i18n';
import type { Clock } from '@/lib/clock';

// The texts of one «مواعيد الحلقة التجريبية» row. The viewer reads their own clock (docs/34, as
// pickedText and the calendar do); the family's own clock is added when it differs. Pure.

export interface RowTexts {
  when: string;
  /** «بتوقيت الأسرة: …» when the family's zone is not the viewer's, else null. */
  family: string | null;
  /** «أم سهيلة، 3 أكتوبر» — who picked it and when; «غير معروف» for an imported row. */
  picked: string;
}

export interface RowTextInput {
  row: TrialDateRow;
  familyTz: string;
  viewerTz?: string | undefined;
}

export function rowTexts({ row, familyTz, viewerTz = currentViewerTz() }: RowTextInput, clock: Clock): RowTexts {
  const at = new Date(row.starts_at);
  const familyAt = lessonWhenAt(at, { tz: familyTz, ...clock });
  // Another zone name on the same clock (Asia/Kuwait vs Riyadh) adds nothing.
  const family = familyAt === lessonWhenAt(at, { tz: viewerTz, ...clock }) ? null : t.trialDate.familyTime.replace('{time}', familyAt);
  const on = dateLabel(zonedParts(new Date(row.picked_at), viewerTz).date);
  return {
    // Every time says its zone (docs/07 principle 7).
    when: `${lessonWhenAt(at, { tz: viewerTz, ...clock })} ${t.schedule.viewerTime}`,
    family,
    picked: t.trialDate.pickedAt.replace('{name}', row.picked_by ?? t.trialDate.unknownPicker).replace('{when}', on),
  };
}
