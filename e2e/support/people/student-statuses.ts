import { randomUUID } from 'node:crypto';
import { quote } from '@ab/shared';
import type { Locator, Page } from '@playwright/test';
import { API, bearer } from '../core/messages';
import { startedToday } from '../finance/money';
import { addDays, nextWeekSaturday, riyadh, withSql } from '../core/schedule';

// Helpers of the student status pipeline spec (owner 2026-10-15, docs/18): students.status, its
// status_change audit trail, the admin profile chip, and the API calls that move a student along.
// Real API (:3100) and database; WhatsApp is tools/wa-stub, never Meta.

interface StatusStep {
  from: string | null;
  to: string | null;
  reason: string | null;
}

/** students.status of one student. */
export async function studentStatusOf(studentId: string): Promise<string | undefined> {
  const [row] = await withSql(
    (sql) => sql<{ status: string }[]>`
    select status::text as status from public.students where id = ${studentId}`,
  );
  return row?.status;
}

/** Every status_change audit row of the student, oldest first: before → after status and the reason. */
export async function statusTrail(studentId: string): Promise<StatusStep[]> {
  return withSql(
    (sql) => sql<StatusStep[]>`
    select before->>'status' as "from", after->>'status' as "to", after->>'reason' as reason
    from public.audit_log
    where entity = 'students' and entity_id = ${studentId} and action = 'status_change'
    order by at, id`,
  );
}

/** The status chip of the admin student profile (StatusChip: its label carries a title). */
export function profileChip(page: Page, label: string): Locator {
  return page.getByTitle(label, { exact: true }).first();
}

/** POST /booking as the admin: one free trial lesson next Sunday 17:00 Riyadh; returns the lesson id. */
export async function bookTrial(
  page: Page,
  input: { teacherId: string; studentId: string },
): Promise<string> {
  const sunday = addDays(nextWeekSaturday(), 1);
  const res = await page.request.post(`${API}/booking`, {
    headers: await bearer(page),
    data: {
      teacherId: input.teacherId,
      byday: [0],
      startTimeLocal: '17:00',
      tz: 'Asia/Riyadh',
      durationMin: 45,
      startsOn: sunday,
      kind: 'trial',
      package: 'trial',
      studentIds: [input.studentId],
      clientRequestId: randomUUID(),
      startsAt: riyadh(sunday, '17:00').toISOString(),
    },
  });
  if (res.status() !== 201) throw new Error(`booking ${res.status()} ${await res.text()}`);
  const { lessons } = (await res.json()) as { lessons: { id: string }[] };
  const lessonId = lessons[0]?.id;
  if (!lessonId) throw new Error('booking made no lesson');
  return lessonId;
}

/**
 * The booked trial is moved to «already started today» (test data, SQL): an outcome is only accepted
 * after the start (409 not_started), and the booking wizard never books in the past.
 */
export async function startNow(lessonId: string): Promise<void> {
  const start = startedToday();
  await withSql(
    (sql) => sql`update public.lessons
    set starts_at = ${start}, ends_at = ${new Date(start.getTime() + 45 * 60_000)} where id = ${lessonId}`,
  );
}

/** POST /lessons/:id/status as the admin (the teacher's «حضر» button): the status code. */
export async function completeLesson(page: Page, lessonId: string): Promise<number> {
  const res = await page.request.post(`${API}/lessons/${lessonId}/status`, {
    headers: await bearer(page),
    data: { event: 'complete' },
  });
  return res.status();
}

interface UnpaidPackage {
  subscriptionId: string;
  price: number;
  currency: string;
}

/** An unpaid «باقة الحلقة الأسبوعية» from today, at the catalog price (test data, SQL, like journey 3). */
export async function unpaidPackage(studentId: string): Promise<UnpaidPackage> {
  const offer = {
    ...quote({ tier: 'weekly', duration: 45, country: 'SA', students: 1, discount: 0 }),
    fx: null,
  };
  const today = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
  const [sub] = await withSql(
    (sql) => sql<{ id: string }[]>`
    insert into public.subscriptions
      (student_id, package, duration, lessons_total, price, currency, price_source, starts_on, status)
    values (${studentId}, '4', ${offer.duration}, ${offer.lessons}, ${offer.afterDiscount}, ${offer.currency},
      ${sql.json(JSON.parse(JSON.stringify(offer)))}, ${today}, 'unpaid')
    returning id`,
  );
  if (!sub) throw new Error('subscription not written');
  return { subscriptionId: sub.id, price: offer.afterDiscount, currency: offer.currency };
}

/** POST /payments as the admin (P2): the full price by bank transfer, a minute ago. The status code. */
export async function recordPayment(page: Page, pkg: UnpaidPackage): Promise<number> {
  const res = await page.request.post(`${API}/payments`, {
    headers: await bearer(page),
    data: {
      subscriptionId: pkg.subscriptionId,
      amount: pkg.price,
      currency: pkg.currency,
      method: 'bank',
      paidAt: new Date(Date.now() - 60_000).toISOString(),
      clientRequestId: randomUUID(),
    },
  });
  return res.status();
}
