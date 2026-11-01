import { leadQualPatch, type QualForm, type QualResult } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// R-LEAD-03: the lead's qualification form lives in @ab/shared (docs/27 E5), shared with the web; this module
// keeps the phone's names, injects `t` and adds the phone's time choices.
export {
  QUAL_TEXT_FIELDS as TEXT_FIELDS,
  leadQualForm as qualForm,
  type QualErrors,
  type QualForm,
  type QualResult,
  type QualTextField as TextField,
} from '@ab/shared';

/** Day chips: السبت → الجمعة, the one shared week order (docs/07 §8). */
export { WEEK_ORDER } from '@ab/shared';

const LAST_MINUTE = 23 * 60 + 59;
const toTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const ALL_TIMES = [...Array.from({ length: 48 }, (_, i) => toTime(i * 30)), toTime(LAST_MINUTE)];

/** Time choices: 30-minute steps plus the day's last minute; a stored off-grid value is kept. */
export function timeOptions(current: string): string[] {
  return !current || ALL_TIMES.includes(current) ? ALL_TIMES : [...ALL_TIMES, current].sort();
}

/** Only what changed, validated with the API's own schema (the v1 keys included). */
export function qualPatch(form: QualForm, before: QualForm): QualResult {
  const c = t.common;
  const text = { invalidTimeZone: c.invalidTimeZone, invalidTime: c.invalidTime, endBeforeStart: c.endBeforeStart, error: c.error };
  return leadQualPatch(form, before, { ...text, ageInvalid: t.students.ageInvalid, phoneErrors: c.phoneErrors });
}
