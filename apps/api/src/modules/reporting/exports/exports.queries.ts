import type { PaymentKind, PaymentMethod } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { Window } from '@/modules/reporting/dashboard/finance/finance.queries';
import { readAll } from '@/common/db/read-all';

const STUDENT =
  'code, code_seq, name, status, program, age, tz, created_at, guardian:guardians(name, phone_e164, country, source), teacher:teachers(display_name_ar)';
const LESSON =
  'id, starts_at, ends_at, status, teacher:teachers(display_name_ar), lesson_students(attendance, chargeable, student:students(code, name))';
const PAYMENT =
  'id, paid_at, amount, currency, method, note, kind, original_amount, original_currency, subscription:subscriptions!inner(student_id, package, lessons_total, student:students(code, name))';

/** payments.csv filters besides the range (the payments page's own filters). */
export type PaymentCsvFilter = { studentId?: string; method?: PaymentMethod; kind?: PaymentKind };
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

  /** Payments with paid_at in the window, narrowed like the payments page. */
  payments(w: Window, f: PaymentCsvFilter = {}) {
    return readAll((from, to) => {
      let q = this.db.from('payments').select(PAYMENT).gte('paid_at', w.from.toISOString()).lt('paid_at', w.to.toISOString());
      if (f.studentId) q = q.eq('subscription.student_id', f.studentId);
      if (f.method) q = q.eq('method', f.method);
      if (f.kind) q = q.eq('kind', f.kind);
      return q
        .order('paid_at')
        .order('id')
        .range(from, to);
    });
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
