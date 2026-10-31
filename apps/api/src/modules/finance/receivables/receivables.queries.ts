import { netPaid, type ReceivableIn, type SubscriptionStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { readAll, readChunked } from '../../teaching/scheduling/read-all';

const SUB = 'id, price, currency, starts_on, status, student:students(id, code, name, guardian:guardians(name, phone_e164))';
/**
 * A trial package never owes, nor an unused-cancelled one (owner 2026-10-28: a mistake, nothing
 * paid); every other status can (an expired package may still be unpaid), and so can a STOPPED one
 * (owner 2026-10-30, migration 991: the course stopped, the money kept).
 */
const OWING = ['unpaid', 'active', 'paused', 'expired'] as const satisfies readonly Exclude<SubscriptionStatus, 'trial' | 'cancelled'>[];
const OWING_FILTER = `status.in.(${OWING.join(',')}),cancel_kind.eq.stopped`;

/** Packages and their net paid for «مستحق على الطلاب» (service role; admin-only routes). */
@Injectable()
export class ReceivablesQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async packages(): Promise<ReceivableIn[]> {
    const rows = await readAll((from, to) =>
      this.db
        .from('subscriptions')
        .select(SUB)
        .or(OWING_FILTER)
        .gt('price', 0)
        .order('starts_on')
        .order('id')
        .range(from, to),
    );
    return rows.flatMap((r) =>
      r.student
        ? [
            {
              id: r.id,
              student: { id: r.student.id, code: r.student.code ?? '', name: r.student.name },
              guardian: r.student.guardian,
              price: Number(r.price),
              currency: r.currency,
              starts_on: r.starts_on,
              status: r.status,
            },
          ]
        : [],
    );
  }

  /** Net paid (payments − refunds) per package, in its own currency. */
  async paid(subscriptionIds: readonly string[]): Promise<Map<string, number>> {
    const rows = await readChunked(subscriptionIds, (chunk) =>
      this.db.from('payments').select('subscription_id, amount, kind').in('subscription_id', chunk),
    );
    const by = new Map<string, { amount: number; kind: 'payment' | 'refund' }[]>();
    for (const r of rows) by.set(r.subscription_id, [...(by.get(r.subscription_id) ?? []), { amount: Number(r.amount), kind: r.kind }]);
    return new Map([...by.entries()].map(([id, list]) => [id, netPaid(list)]));
  }
}
