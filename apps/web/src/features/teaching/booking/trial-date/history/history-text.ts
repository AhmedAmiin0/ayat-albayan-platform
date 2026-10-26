import { lessonWhenText, type TrialDateRow } from '@ab/shared';
import { dateLabel, RIYADH_TZ, zonedParts } from '@/features/teaching/schedule/tz';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

// The texts of one «مواعيد الحلقة التجريبية» row. The viewer reads the academy's clock (Riyadh, as
// pickedText and the calendar do); the family's own clock is added when their zone differs. Pure.

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

export function rowTexts({ row, familyTz, viewerTz = RIYADH_TZ }: RowTextInput): RowTexts {
  const at = new Date(row.starts_at);
  const familyAt = lessonWhenText(at, familyTz, locale);
  // Another zone name on the same clock (Asia/Kuwait vs Riyadh) adds nothing.
  const family = familyAt === lessonWhenText(at, viewerTz, locale) ? null : t.trialDate.familyTime.replace('{time}', familyAt);
  const on = dateLabel(zonedParts(new Date(row.picked_at), viewerTz).date);
  return {
    // Every time says its zone (docs/07 principle 7).
    when: viewerTz === RIYADH_TZ ? `${lessonWhenText(at, viewerTz, locale)} ${t.schedule.riyadhTime}` : lessonWhenText(at, viewerTz, locale),
    family,
    picked: t.trialDate.pickedAt.replace('{name}', row.picked_by ?? t.trialDate.unknownPicker).replace('{when}', on),
  };
}
