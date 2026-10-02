import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { Window } from '../dashboard/finance.queries';
import { readAll } from '../scheduling/read-all';

const STUDENT =
  'code, code_seq, name, status, program, age, tz, created_at, guardian:guardians(name, phone_e164, country, source), teacher:teachers(display_name_ar)';
const LESSON =
  'id, starts_at, ends_at, status, teacher:teachers(display_name_ar), lesson_students(attendance, chargeable, student:students(code, name))';
const PAYMENT =
  'id, paid_at, amount, currency, method, note, subscription:subscriptions(package, lessons_total, student:students(code, name))';
const PAYOUT =
  'id, month, lessons_count, amount, currency, status, paid_at, breakdown, teacher:teachers(display_name_ar)';

/** Reads for the CSV exports (service role; admin-only routes). Paged so nothing is cut (R-NFR-08). */
@Injectable()
export class ExportsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every student, by code. */
  students() {
    return readAll((from, to) => this.db.from('students').select(STUDENT).order('code_seq').range(from, to));
  }

  /** Lessons starting in the window, every status, with their students. */
  lessons(w: Window) {
    return readAll((from, to) =>
      this.db
        .from('lessons')
        .select(LESSON)
        .gte('starts_at', w.from.toISOString())
        .lt('starts_at', w.to.toISOString())
        .order('starts_at')
        .order('id')
        .range(from, to),
    );
  }

  /** Payments with paid_at in the window. */
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

  /** The month's payout rows (`month` = its first day), as B3 generated them. */
  payouts(monthStart: string) {
    return readAll((from, to) =>
      this.db.from('teacher_payouts').select(PAYOUT).eq('month', monthStart).order('id').range(from, to),
    );
  }
}

export type StudentExportRow = Awaited<ReturnType<ExportsQueries['students']>>[number];
export type LessonExportRow = Awaited<ReturnType<ExportsQueries['lessons']>>[number];
export type PaymentExportRow = Awaited<ReturnType<ExportsQueries['payments']>>[number];
export type PayoutExportRow = Awaited<ReturnType<ExportsQueries['payouts']>>[number];
