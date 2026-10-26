import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { readAll, readChunked } from '../../scheduling/read-all';

export type Window = { from: Date; to: Date };

const PAYMENT =
  'id, amount, currency, paid_at, kind, subscription:subscriptions(fx_rate, student:students(guardian:guardians(source)))';

/** Finance reads for the dashboard (service role; the controller is admin-only). Paged (R-NFR-08). */
@Injectable()
export class FinanceQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Payments with paid_at in the window, with the payer's guardian source. */
  payments(w: Window) {
    return readAll((from, to) =>
      this.db
        .from('payments')
        .select(PAYMENT)
        .gte('paid_at', w.from.toISOString())
        .lt('paid_at', w.to.toISOString())
        .order('paid_at')
        .order('id')
        .range(from, to),
    );
  }

  /**
   * Lessons starting in the window that count toward teacher pay, with their frozen ledger amount
   * (v_teacher_payable_lessons: the ONE rule of migration 20261005000200; null = no rate).
   */
  payableLessons(w: Window) {
    return readAll((from, to) =>
      this.db
        .from('v_teacher_payable_lessons')
        .select('lesson_id, starts_at, amount')
        .gte('starts_at', w.from.toISOString())
        .lt('starts_at', w.to.toISOString())
        .order('starts_at')
        .order('lesson_id')
        .range(from, to),
    );
  }

  /** The guardian source of every student on these lessons (a lesson's cost is split between them). */
  lessonSources(lessonIds: readonly string[]) {
    return readChunked(lessonIds, (chunk) =>
      this.db.from('lesson_students').select('lesson_id, student:students(guardian:guardians(source))').in('lesson_id', chunk),
    );
  }

  /** Expenses of the months `first`…`last` ("YYYY-MM"), inclusive. */
  expenses(first: string, last: string) {
    return readAll((from, to) =>
      this.db
        .from('expenses')
        .select('id, month, category, amount, currency')
        .eq('is_draft', false)
        .gte('month', `${first}-01`)
        .lte('month', `${last}-01`)
        .order('month')
        .order('id')
        .range(from, to),
    );
  }
}

export type PaymentRow = Awaited<ReturnType<FinanceQueries['payments']>>[number];
export type ExpenseRow = Awaited<ReturnType<FinanceQueries['expenses']>>[number];
