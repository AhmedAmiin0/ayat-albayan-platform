import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import type { Window } from '../dashboard/finance/finance.queries';
import type { SessionIn } from './finance.rows';
import { readAll } from '../../teaching/scheduling/read-all';

const EXPENSE = 'month, paid_on, category, amount, currency, vendor, method, note, recurring, is_draft, cat:expense_categories(label_ar)';
const SESSION = 'lesson_id, teacher_id, starts_at, minutes, rate, amount, paid_amount, status, teacher:teachers(display_name_ar)';
const TPAY = 'paid_at, amount, method, note, payout_id, voided_at, void_reason, teacher_id, teacher:teachers(display_name_ar)';

/** Reads for the finance CSVs (expenses, teacher ledger). Service role; admin-only routes. Paged. */
@Injectable()
export class FinanceExportsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Expenses of months `first`…`last` (YYYY-MM-01), drafts included (flagged in the file). */
  expenses(first: string, last: string) {
    return readAll((from, to) =>
      this.db.from('expenses').select(EXPENSE).gte('month', first).lte('month', last).order('month').order('id').range(from, to),
    );
  }

  /** Ledger sessions (the one pay rule) starting in the window; one teacher or all. */
  sessions(w: Window, teacherId?: string) {
    return readAll((from, to) => {
      let q = this.db.from('v_teacher_countable_earnings').select(SESSION);
      if (teacherId) q = q.eq('teacher_id', teacherId);
      return q
        .gte('starts_at', w.from.toISOString())
        .lt('starts_at', w.to.toISOString())
        .order('starts_at')
        .order('lesson_id')
        .range(from, to)
        .returns<SessionIn[]>();
    });
  }

  /** Teacher payments made in the window, voided ones included (marked). */
  teacherPayments(w: Window, teacherId?: string) {
    return readAll((from, to) => {
      let q = this.db.from('teacher_payments').select(TPAY);
      if (teacherId) q = q.eq('teacher_id', teacherId);
      return q.gte('paid_at', w.from.toISOString()).lt('paid_at', w.to.toISOString()).order('paid_at').order('id').range(from, to);
    });
  }
}

export type ExpenseCsvRow = Awaited<ReturnType<FinanceExportsQueries['expenses']>>[number];
export type SessionCsvRow = Awaited<ReturnType<FinanceExportsQueries['sessions']>>[number];
export type TeacherPaymentCsvRow = Awaited<ReturnType<FinanceExportsQueries['teacherPayments']>>[number];
