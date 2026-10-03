import type { Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { BOM, parseCsv, readDownload } from '../support/exports-csv';
import { seedPackageStudent } from '../support/money';
import { riyadhToday, uniqueName } from '../support/money-extra';
import { addDays, resetAbrar, withSql } from '../support/schedule';

// CSV exports (R-RPT-03) from the ExportsPanel on /admin: students, lessons, payments, payouts.
// Each file starts with the U+FEFF BOM, has the ar.json header row, E.164 phones, AB-nnnn codes and
// Riyadh «YYYY-MM-DD HH:MM» times (compared with SQL's own conversion), and a `<name>-<range>.csv` name.

const { students: S, guardians: G, payments: P, payouts: Y, subscriptions: SUB, exports: X } = ar;
const HEADERS = {
  students: [S.code, S.name, S.status, S.program, S.age, S.teacher, S.guardian, S.guardianPhone, G.country, G.source, S.tz, S.createdAt],
  lessons: [X.columns.date, X.columns.time, SUB.duration, S.teacher, S.code, S.name, X.columns.lessonStatus, X.columns.attendance, X.columns.chargeable],
  payments: [P.paidAt, S.code, S.name, SUB.package, SUB.lessonsTotal, P.amount, P.currency, P.method, P.note],
  payouts: [Y.teacher, Y.month, S.status, SUB.duration, Y.lessons, Y.rate, Y.amount, P.currency, P.paidAt],
};
const STAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const today = riyadhToday();
const range = { from: addDays(today, -7), to: today };
const lastMonth = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1)).toISOString().slice(0, 7);

async function download(page: Page, kind: keyof typeof HEADERS): Promise<{ name: string; rows: string[][]; text: string }> {
  const label = X[kind];
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: `${X.download}: ${label}` }).click(),
  ]);
  const text = await readDownload(file);
  return { name: file.suggestedFilename(), rows: parseCsv(text), text };
}

interface Facts {
  code: string;
  phone: string;
  created: string;
  paid: string;
  lesson: { date: string; time: string };
}

async function factsOf(studentId: string): Promise<Facts> {
  const stamp = (col: string) => `to_char(${col} at time zone 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI')`;
  return withSql(async (sql) => {
    const [s] = await sql<{ code: string; phone: string; created: string }[]>`
      select s.code, g.phone_e164 as phone, ${sql.unsafe(stamp('s.created_at'))} as created
      from public.students s join public.guardians g on g.id = s.guardian_id where s.id = ${studentId}`;
    const [p] = await sql<{ paid: string }[]>`
      select ${sql.unsafe(stamp('p.paid_at'))} as paid from public.payments p
      join public.subscriptions b on b.id = p.subscription_id where b.student_id = ${studentId}`;
    const [l] = await sql<{ at: string }[]>`
      select ${sql.unsafe(stamp('l.starts_at'))} as at from public.lessons l
      join public.lesson_students ls on ls.lesson_id = l.id
      where ls.student_id = ${studentId} and l.status = 'scheduled'`;
    if (!s || !p || !l) throw new Error('export facts missing');
    return { ...s, paid: p.paid, lesson: { date: l.at.slice(0, 10), time: l.at.slice(11) } };
  });
}

test.describe('CSV exports (R-RPT-03)', () => {
  test('students, lessons, payments and payouts: BOM, header, E.164, Riyadh times, file names', async ({ asRole }) => {
    const student = uniqueName('تصدير');
    const seed = await seedPackageStudent({ teacherId: await resetAbrar(), paid: true, guardian: 'أم تصدير', student });
    const facts = await factsOf(seed.studentId);
    const page = await asRole('admin');
    await page.goto(`/admin?from=${range.from}&to=${range.to}`);

    const students = await download(page, 'students');
    expect(students.name).toBe(`students-${today}.csv`);
    expect(students.text.startsWith(BOM)).toBe(true);
    expect(students.rows[0]).toEqual(HEADERS.students);
    const me = students.rows.find((r) => r[0] === facts.code);
    expect(me?.[0]).toMatch(/^AB-\d{4,}$/);
    expect(me?.[1]).toBe(student);
    expect(me?.[7]).toBe(facts.phone);
    expect(me?.[7]).toMatch(/^\+\d{8,15}$/);
    expect(me?.[11]).toBe(facts.created);

    const lessons = await download(page, 'lessons');
    expect(lessons.name).toBe(`lessons-${range.from}_${range.to}.csv`);
    expect(lessons.text.startsWith(BOM)).toBe(true);
    expect(lessons.rows[0]).toEqual(HEADERS.lessons);
    const mine = lessons.rows.filter((r) => r[4] === facts.code);
    expect(mine).toHaveLength(2); // the completed one 3 days ago and today's
    const todays = mine.find((r) => r[6] === ar.enums.lessonStatus.scheduled);
    expect(todays).toEqual([facts.lesson.date, facts.lesson.time, ar.enums.duration[90], 'أبرار', facts.code, student, ar.enums.lessonStatus.scheduled, '', ar.common.yes]);
    const done = mine.find((r) => r[6] === ar.enums.lessonStatus.completed);
    expect(done?.[7]).toBe(ar.enums.attendance.on_time);
    expect(`${done?.[0]} ${done?.[1]}`).toMatch(STAMP);

    const payments = await download(page, 'payments');
    expect(payments.name).toBe(`payments-${range.from}_${range.to}.csv`);
    expect(payments.text.startsWith(BOM)).toBe(true);
    expect(payments.rows[0]).toEqual(HEADERS.payments);
    const pay = payments.rows.find((r) => r[1] === facts.code);
    expect(pay).toEqual([facts.paid, facts.code, student, ar.enums.packageSize['4'], '4', String(seed.price), 'SAR', ar.enums.paymentMethod.bank, 'e2e seed']);

    // Payouts: the panel starts on last month; the file has the header whatever was approved.
    const payouts = await download(page, 'payouts');
    expect(payouts.name).toBe(`payouts-${lastMonth}.csv`);
    expect(payouts.text.startsWith(BOM)).toBe(true);
    expect(payouts.rows[0]).toEqual(HEADERS.payouts);
  });
});
