import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { API, bearer } from './messages';
import { seedPackageStudent, type PackageSeed } from './money';
import { addDays, riyadh, seedLesson, withSql } from './schedule';

// Extra money-journey helpers (A7–A10): near-empty package, dashboard summary, in-memory receipt.

/** A 1×1 PNG, built in memory (setInputFiles takes a buffer: no fixture file on disk). */
export const RECEIPT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Today in Riyadh, YYYY-MM-DD. */
export function riyadhToday(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}

interface NearEmpty extends PackageSeed {
  /** Tomorrow's scheduled lesson: flagged once the package hits 0 while unpaid. */
  futureLessonId: string;
}

/**
 * A paid weekly package (4 lessons) with 3 used and today's started lesson still scheduled:
 * completing it leaves 0. A later lesson tomorrow 12:00 Riyadh is booked for the flag.
 */
export async function seedNearEmpty(input: { teacherId: string; guardian: string; student: string }): Promise<NearEmpty> {
  const seed = await seedPackageStudent({ ...input, paid: true });
  const today = riyadhToday();
  for (const days of [-5, -4]) {
    const id = await seedLesson({
      teacherId: input.teacherId,
      studentId: seed.studentId,
      startsAt: riyadh(addDays(today, days), '10:00'),
      minutes: 45,
    });
    await withSql(async (sql) => {
      await sql`update public.lessons set status = 'completed' where id = ${id}`;
      await sql`update public.lesson_students set attendance = 'on_time' where lesson_id = ${id}`;
    });
  }
  const futureLessonId = await seedLesson({
    teacherId: input.teacherId,
    studentId: seed.studentId,
    startsAt: riyadh(addDays(today, 1), '12:00'),
    minutes: 45,
  });
  return { ...seed, futureLessonId };
}

export interface SummaryFinance {
  currency: string;
  revenue: number;
  teacher_cost: number;
  expenses: number;
  gross_margin: number;
  by_source: { source: string; leads: number; converted: number; revenue: number }[];
}

export interface Summary {
  funnel: Record<string, number>;
  active_students: number;
  lessons_by_status: Record<string, number>;
  needs_confirmation: number;
  pending_reports: number;
  unpaid_subscriptions: number;
  open_tasks: number;
  teacher_load: { display_name_ar: string; students: number; lessons: number }[];
  finance: SummaryFinance;
}

/** GET /dashboard/summary for a Riyadh day range, as the page's admin. */
export async function summaryOf(page: Page, range: { from: string; to: string }): Promise<Summary> {
  const res = await page.request.get(`${API}/dashboard/summary?from=${range.from}&to=${range.to}`, {
    headers: await bearer(page),
  });
  expect(res.status()).toBe(200);
  return (await res.json()) as Summary;
}

/** A fresh first-of-month key (YYYY-MM-01) for this Riyadh month. */
export function thisMonthStart(now = new Date()): string {
  return `${riyadhToday(now).slice(0, 7)}-01`;
}

/** `base` + a per-run suffix in Arabic letters (digits in a name could be read as a phone search). */
export function uniqueName(base: string): string {
  const letters = 'ابتثجحخدذر';
  const tail = [...String(Date.now()).slice(-5)].map((d) => letters.charAt(Number(d))).join('');
  return `${base} ${tail}`;
}

/** The seeded guardian's E.164 phone (to find the child through the student picker). */
export async function guardianPhoneOf(guardianId: string): Promise<string> {
  const [row] = await withSql((sql) => sql<{ phone_e164: string }[]>`
    select phone_e164 from public.guardians where id = ${guardianId}`);
  if (!row) throw new Error('guardian missing');
  return row.phone_e164;
}
