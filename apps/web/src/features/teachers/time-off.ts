import { timeOffCreateSchema, type TimeOffCreate } from '@ab/shared';
import { t } from '@/lib/i18n';

/** Raw `<input type="datetime-local">` values + reason, as typed. */
export type TimeOffDraft = { starts_at: string; ends_at: string; reason: string };
export const emptyTimeOffDraft: TimeOffDraft = { starts_at: '', ends_at: '', reason: '' };

// ponytail: datetime-local is read in the browser's zone (usually the teacher's own); converting
// from teacher.tz needs the API's zoned-time helper moved to @ab/shared.
const toIso = (local: string) => {
  const ms = Date.parse(local);
  return Number.isNaN(ms) ? local : new Date(ms).toISOString();
};

/** Draft → POST body (UTC ISO, rule 6) or the Arabic error to show. R-TCH-02. */
export function toTimeOffBody(
  draft: TimeOffDraft,
): { ok: true; body: TimeOffCreate } | { ok: false; error: string } {
  const result = timeOffCreateSchema.safeParse({
    starts_at: toIso(draft.starts_at),
    ends_at: toIso(draft.ends_at),
    reason: draft.reason.trim() || null,
  });
  if (result.success) return { ok: true, body: result.data };
  // zod 4 still runs the end>start refine when a date is missing, so "missing" wins.
  const missing = result.error.issues.some((i) => i.message !== 'end_before_start');
  return { ok: false, error: missing ? t.common.required : t.common.endBeforeStart };
}

const display = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

/** UTC instant → local Arabic date-time for display. */
export function formatInstant(iso: string): string {
  return display.format(new Date(iso));
}
