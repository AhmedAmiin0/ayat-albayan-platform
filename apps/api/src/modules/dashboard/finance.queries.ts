import type { LessonStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { readAll } from '../scheduling/read-all';

export type Window = { from: Date; to: Date };

const PAYMENT = 'id, amount, currency, paid_at, subscription:subscriptions(student:students(guardian:guardians(source)))';
const COST_LESSON =
  'id, starts_at, ends_at, teacher:teachers(rate_30, rate_45, rate_60, rate_90), lesson_students(student:students(guardian:guardians(source)))';

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

  /** Lessons starting in the window whose status is paid to the teacher (payoutStatuses). */
  paidLessons(w: Window, statuses: readonly LessonStatus[]) {
    return readAll((from, to) =>
      this.db
        .from('lessons')
        .select(COST_LESSON)
        .in('status', [...statuses])
        .gte('starts_at', w.from.toISOString())
        .lt('starts_at', w.to.toISOString())
        .order('starts_at')
        .order('id')
        .range(from, to),
    );
  }

  /** Expenses of the months `first`…`last` ("YYYY-MM"), inclusive. */
  expenses(first: string, last: string) {
    return readAll((from, to) =>
      this.db
        .from('expenses')
        .select('id, month, category, amount, currency')
        .gte('month', `${first}-01`)
        .lte('month', `${last}-01`)
        .order('month')
        .order('id')
        .range(from, to),
    );
  }
}

export type PaymentRow = Awaited<ReturnType<FinanceQueries['payments']>>[number];
export type CostLessonRow = Awaited<ReturnType<FinanceQueries['paidLessons']>>[number];
export type ExpenseRow = Awaited<ReturnType<FinanceQueries['expenses']>>[number];
