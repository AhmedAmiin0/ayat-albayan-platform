import type { AdminTaskKind, LessonStatus, PackageSize } from '@ab/shared';
import { round2 } from './conversion';
import { WORK_ITEMS, type PendingReportRow, type TaskRow, type UnpaidRow, type WorkList } from './dashboard.types';

// GET /dashboard/work rows (pure). Each list: the total, and the oldest WORK_ITEMS first.

type Student = { id: string; code: string | null; name: string } | null;

export interface PendingIn {
  lesson_id: string;
  student: Student;
  lesson: { starts_at: string; status: LessonStatus; teacher: { id: string; display_name_ar: string } | null } | null;
}
export interface UnpaidIn {
  id: string;
  package: PackageSize | null;
  lessons_total: number;
  price: number;
  currency: string;
  starts_on: string;
  student: Student;
  payments: { amount: number }[];
}
export interface TaskIn {
  id: string;
  kind: AdminTaskKind;
  subject_type: string;
  subject_id: string;
  title: string | null;
  due_at: string | null;
  done_at: string | null;
  created_at: string;
}
export interface SubjectIn {
  id: string;
  student: Student;
  balance: { lessons_total: number | null; lessons_used: number | null } | null;
}

const student = (s: Student) => (s ? { id: s.id, code: s.code ?? '', name: s.name } : null);
const list = <T>(items: T[]): WorkList<T> => ({ total: items.length, items: items.slice(0, WORK_ITEMS) });

export function pendingList(rows: readonly PendingIn[]): WorkList<PendingReportRow> {
  const out: PendingReportRow[] = [];
  for (const r of rows) {
    const s = student(r.student);
    if (!s || !r.lesson?.teacher) continue;
    const { starts_at, status, teacher } = r.lesson;
    out.push({ lesson_id: r.lesson_id, starts_at, status, teacher, student: s });
  }
  out.sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.student.name.localeCompare(b.student.name, 'ar'));
  return list(out);
}

/**
 * Status `unpaid` covers two cases (R-SUB-02, subscriptionStatusFor): money still owed, or a
 * package paid in full whose lessons are used up. `reason` tells the admin which one to chase.
 */
export function unpaidList(rows: readonly UnpaidIn[]): WorkList<UnpaidRow> {
  return list(
    rows.flatMap((r) => {
      const s = student(r.student);
      if (!s) return [];
      const { id, package: pkg, lessons_total, currency, starts_on } = r;
      const price = Number(r.price);
      const paid = round2(r.payments.reduce((n, p) => n + Number(p.amount), 0));
      const owed = round2(Math.max(0, price - paid));
      const reason = owed > 0 ? 'owes' : 'renewal_due';
      return [{ id, student: s, package: pkg, lessons_total, price, paid, owed, reason, currency, starts_on } as const];
    }),
  );
}

/** Tasks about a package carry its student and use («باقة سهيلة قربت تخلص: فاضل حلقتين»). */
export function taskList(tasks: readonly TaskIn[], subjects: readonly SubjectIn[]): WorkList<TaskRow> {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  return list(
    tasks.map((t) => {
      const subject = t.subject_type === 'subscription' ? byId.get(t.subject_id) : undefined;
      const b = subject?.balance;
      const balance = b && b.lessons_total !== null ? { used: b.lessons_used ?? 0, total: b.lessons_total } : null;
      return { ...t, student: student(subject?.student ?? null), balance };
    }),
  );
}
