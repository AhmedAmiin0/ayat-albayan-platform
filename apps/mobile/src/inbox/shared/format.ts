import type { ClockCycle, ThreadView } from '@ab/shared';
import { clockIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';

// Display helpers for the inbox. Hermes has no Intl.RelativeTimeFormat / PluralRules, so the age
// is built from ar.json forms (Egyptian «من 3 أيام»), Western digits only (docs/07 §2).

export type PluralForm = 'one' | 'two' | 'few' | 'other';

/** Arabic count form: 1, 2, 3–10 (by the last two digits), everything else. */
export function pluralForm(n: number): PluralForm {
  if (n === 1) return 'one';
  if (n === 2) return 'two';
  const rest = n % 100;
  return rest >= 3 && rest <= 10 ? 'few' : 'other';
}

function counted(forms: Record<PluralForm, string>, n: number): string {
  return forms[pluralForm(n)].replace('{n}', String(n));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Lead age, like the web inbox column: minutes under an hour, hours under a day, then days. */
export function leadAge(iso: string, now: Date = new Date()): string {
  const ms = Math.max(0, now.getTime() - Date.parse(iso));
  const age = t.mobile.age;
  if (ms < MINUTE) return age.now;
  if (ms < HOUR) return counted(age.minutes, Math.floor(ms / MINUTE));
  if (ms < DAY) return counted(age.hours, Math.floor(ms / HOUR));
  return counted(age.days, Math.floor(ms / DAY));
}

/** «16:20» / «4:20 م» in the viewer's `tz`: when the cached list on screen was last fetched (R-MOB-03). */
export function clockAt(epochMs: number, cycle: ClockCycle, tz: string): string {
  return clockIn(new Date(epochMs), tz, cycle);
}

/** Who the number is in words (guardian / teacher / lead, else «رقم مش متسجل»): never the number. */
export function kindLabel(thread: ThreadView | null | undefined): string {
  if (thread?.guardian_id) return t.inbox.kind.guardian;
  if (thread?.teacher_id) return t.inbox.kind.teacher;
  if (thread?.lead_id) return t.inbox.kind.lead;
  return t.inbox.unknownNumber;
}
