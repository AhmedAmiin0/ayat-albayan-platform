import { leadQualPatch, type QualForm, type QualResult } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

// R-LEAD-03: the lead's qualification form lives in @ab/shared (docs/27 E5), shared with the mobile app;
// this module keeps the web's names and injects `t`.
export {
  QUAL_TEXT_FIELDS as TEXT_FIELDS,
  leadQualForm as qualForm,
  type QualErrors,
  type QualForm,
  type QualResult,
  type QualTextField,
} from '@ab/shared';

/** Only what changed, validated with the API's own schema (leadQualificationPatchSchema). */
export function qualPatch(form: QualForm, before: QualForm): QualResult {
  const c = t.common;
  const text = { invalidTimeZone: c.invalidTimeZone, invalidTime: c.invalidTime, endBeforeStart: c.endBeforeStart, error: c.error };
  return leadQualPatch(form, before, { ...text, ageInvalid: t.students.ageInvalid, phoneErrors: c.phoneErrors });
}
