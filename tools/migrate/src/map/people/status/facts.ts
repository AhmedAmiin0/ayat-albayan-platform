// Gathers the status evidence of every student being built (pure) and decides each status with
// rules.ts; downgrade.ts reports what the old rule would have made active.
import type { StudentStatus } from '@ab/shared';
import type { SourceBundle } from '../../../entities/contract.ts';
import { keyId } from '../../../keys.ts';
import type { Desired } from '../../../plan/resolve.ts';
import { phoneCell } from '../../../sources/sheets/cells.ts';
import type { RowIssue } from '../../../types.ts';
import { importFrom } from '../../schedule/bookings.ts';
import type { Person } from '../collect.ts';
import { studentIndex } from '../match.ts';
import { bookingFacts } from './bookings.ts';
import { downgradeIssue } from './downgrade.ts';
import { paymentFacts } from './payments.ts';
import { DEFAULT_EXPIRY_DAYS, importedStatus } from './rules.ts';

/** Report facts (taught.ts) and SUBS facts (subs.ts) the status needs. */
interface LessonFacts {
  attended: ReadonlySet<string>;
  chargeable: ReadonlySet<string>;
  subsActive: ReadonlySet<string>;
}

/** Phones of every HEART «subscription» row (the old rule's paying families). */
function heartPhones(bundle: SourceBundle): Set<string> {
  const out = new Set<string>();
  for (const r of bundle.sheets['heart_subscriptions'] ?? []) {
    const p = phoneCell(r.fields['phone']);
    if (p.ok) out.add(p.e164);
  }
  return out;
}

type StatusOf = (p: Person) => { status: StudentStatus; issue: RowIssue | null };

export function statusFacts(
  bundle: SourceBundle,
  students: readonly Desired[],
  lessons: LessonFacts,
): StatusOf {
  const ix = studentIndex(students);
  const expiryDays = bundle.expiryDays ?? DEFAULT_EXPIRY_DAYS;
  const paid = paymentFacts({ bundle, ix, today: importFrom(bundle), expiryDays });
  const booked = bookingFacts(bundle, ix);
  const phones = heartPhones(bundle);
  return (p) => {
    const id = keyId(p.key);
    const status = importedStatus({
      payment: paid.get(id) ?? null,
      series: booked.series.has(id),
      attended: lessons.attended.has(id) || booked.done.has(id),
    });
    const grounds = {
      claims: p.claims,
      payingPhone: phones.has(p.phone),
      chargeable: lessons.chargeable.has(id),
      subsRegister: lessons.subsActive.has(id),
    };
    return { status, issue: downgradeIssue(p.ref, { grounds, status }) };
  };
}
