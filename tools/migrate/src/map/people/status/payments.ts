// Payment evidence per student (pure): HEART «subscription» rows that were paid — marked «Paid», or
// priced by a FIN income-statement revenue row of the same month — found on the guardian phone like
// money/heart.ts. FIN rows alone name no phone, so they count only through a HEART row.
import type { SourceBundle } from '../../../entities/contract.ts';
import { keyId } from '../../../keys.ts';
import { phoneCell, text, ymd } from '../../../sources/sheets/cells.ts';
import { testReason } from '../../../sources/sheets/test-rows.ts';
import type { SourceRow } from '../../../types.ts';
import { finPrice } from '../../money/fin.ts';
import { type StudentIndex, findStudent } from '../match.ts';
import { type PaymentState, bestPayment, paymentState } from './rules.ts';

interface PaymentCtx {
  bundle: SourceBundle;
  ix: StudentIndex;
  /** The import date ('YYYY-MM-DD'). */
  today: string;
  expiryDays: number;
}

interface HeartPeriod {
  name: string;
  phone: string;
  startsOn: string;
  paidStatus: string | null;
}

function heartPeriod(r: SourceRow): HeartPeriod | null {
  const name = text(r.fields.name);
  const phone = phoneCell(r.fields.phone);
  const startsOn = ymd(r.fields.date);
  if (!name || !phone.ok || !startsOn || testReason({ names: [name], phone: phone.e164 }))
    return null;
  return { name, phone: phone.e164, startsOn, paidStatus: text(r.fields.paid_status) };
}

const isPaid = (h: HeartPeriod, bundle: SourceBundle): boolean =>
  /^paid$/i.test(h.paidStatus ?? '') ||
  finPrice(bundle, { name: h.name, month: h.startsOn.slice(0, 7) }) !== null;

/** A paid HEART row → its student's keyId and period start, else null. */
function paidRow(r: SourceRow, c: PaymentCtx): { id: string; startsOn: string } | null {
  const h = heartPeriod(r);
  if (!h) return null;
  const found = isPaid(h, c.bundle) ? findStudent(c.ix, { phone: h.phone, name: h.name }) : null;
  return found?.ok ? { id: keyId(found.student.key), startsOn: h.startsOn } : null;
}

/** student keyId → the best state of their paid periods on the import date. */
export function paymentFacts(c: PaymentCtx): Map<string, PaymentState> {
  const out = new Map<string, PaymentState>();
  for (const r of c.bundle.sheets.heart_subscriptions ?? []) {
    const p = paidRow(r, c);
    if (!p) continue;
    const state = paymentState({ startsOn: p.startsOn, today: c.today, expiryDays: c.expiryDays });
    out.set(p.id, bestPayment(out.get(p.id), state));
  }
  return out;
}
