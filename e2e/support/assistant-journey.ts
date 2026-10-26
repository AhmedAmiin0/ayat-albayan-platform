import type { StudentStatus } from '@ab/shared';
import type { Page, TestInfo } from '@playwright/test';
import { chatMore, fromChatMore } from './chat-more';
import { ar, expect } from './fixtures';
import { bearer, API } from './messages';
import { withSql } from './schedule';
import { studentStatusOf } from './student-statuses';
import { stubSent } from './wa-stub';

export { expectInChatMore, fromChatMore } from './chat-more';

// Helpers of journey 7 (owner 2026-10-15): the assistant's (base role sales) whole student cycle. Real API
// (:3100), local Supabase and tools/wa-stub; every number is a fake. The status is read three ways: the
// students row, its newest status_change audit row (docs/18) and «تحقق من التسجيل» in the assistant's chat.

const R = ar.registrationCheck;

export interface Family {
  /** E.164 of the fake family (the chat's number). */
  phone: string;
  /** The child's name (unique per run). */
  name: string;
}

export interface StatusRow {
  from: string | null;
  to: string | null;
  reason: string | null;
  via: string | null;
}

/** The newest status_change audit row of the student. */
async function lastStatusRow(studentId: string): Promise<StatusRow | undefined> {
  const [row] = await withSql(
    (sql) => sql<StatusRow[]>`
    select before->>'status' as "from", after->>'status' as "to", after->>'reason' as reason, after->>'via' as via
    from public.audit_log
    where entity = 'students' and entity_id = ${studentId} and action = 'status_change'
    order by at desc, id desc limit 1`,
  );
  return row;
}

/** The assistant's chat with the family, freshly loaded (no cached registration check). */
export async function openChat(page: Page, phone: string): Promise<void> {
  await page.goto(`/sales/inbox?phone=${encodeURIComponent(phone)}`);
  await expect(chatMore(page)).toBeVisible({ timeout: 30_000 });
}

/** «تحقق من التسجيل» in the open chat: `expected` is visible in the answer, then the dialog is closed. */
export async function checkRegistration(page: Page, expected: string): Promise<void> {
  await fromChatMore(page, R.action);
  const dialog = page.getByRole('dialog', { name: R.title });
  await expect(dialog.getByText(expected, { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: R.close }).first().click();
  await expect(dialog).toHaveCount(0);
}

/** The status line of one registered child in the check's answer. */
const statusLine = (status: StudentStatus) => `${R.status}: ${ar.enums.studentStatus[status]}`;

export interface Expected {
  to: StudentStatus;
  /** null: no status_change row yet (a registration with a trial starts at `trial`, docs/18 transition 1). */
  from: StudentStatus | null;
  reason: string | null;
  via?: string;
}

/**
 * students.status is `to`, the newest audit row is the move from → to with its reason, and the assistant's
 * «تحقق من التسجيل» shows the Arabic status (the chat is reopened first).
 */
export async function expectStatus(page: Page, who: Family & { studentId: string }, want: Expected): Promise<void> {
  await expect.poll(() => studentStatusOf(who.studentId), { timeout: 20_000 }).toBe(want.to);
  const row = await lastStatusRow(who.studentId);
  if (want.from === null) expect(row).toBeUndefined();
  else expect(row).toMatchObject({ from: want.from, to: want.to, reason: want.reason, ...(want.via ? { via: want.via } : {}) });
  await page.bringToFront(); // the admin's page may hold focus; an open chat polls only while focused (W13)
  await openChat(page, who.phone);
  await checkRegistration(page, statusLine(want.to));
}

/**
 * Nothing reached «Meta» (the stub) as a template, and no text went to any number but the family's.
 * Messaging stays off in this journey, so in practice nothing is sent at all.
 */
export async function expectQuietStub(phone: string): Promise<void> {
  const sent = await stubSent();
  expect(sent.filter((m) => m.type === 'template' || m.template !== undefined)).toEqual([]);
  expect(sent.filter((m) => `+${m.to.replace(/^\+/, '')}` !== phone)).toEqual([]);
}

/** A full-page screenshot for the owner (uploaded by CI as assistant-journey-screens). */
export async function shot(page: Page, info: TestInfo, file: string): Promise<void> {
  await page.screenshot({ path: info.outputPath(`${file}.png`), fullPage: true });
}

/** One call of the admin's (or the teacher's) page against the API: the status code and body text. */
export async function apiAs(page: Page, req: { method: 'PATCH' | 'POST'; path: string; data: object }): Promise<{ status: number; body: string }> {
  const res = await page.request.fetch(`${API}${req.path}`, { method: req.method, headers: await bearer(page), data: req.data });
  return { status: res.status(), body: await res.text() };
}

/** The family's lead (created by the inbound message), once the webhook wrote it. */
export async function leadIdOf(phone: string): Promise<string> {
  let id = '';
  await expect
    .poll(async () => {
      const [row] = await withSql((sql) => sql<{ id: string }[]>`select id from public.leads where phone_e164 = ${phone}`);
      id = row?.id ?? '';
      return id;
    })
    .not.toBe('');
  return id;
}

/** The registered child and its newest lesson (the booked trial). */
export async function childAndTrial(name: string): Promise<{ studentId: string; lessonId: string }> {
  const [row] = await withSql(
    (sql) => sql<{ student_id: string; lesson_id: string }[]>`
    select s.id as student_id, l.id as lesson_id from public.students s
    join public.lesson_students ls on ls.student_id = s.id join public.lessons l on l.id = ls.lesson_id
    where s.name = ${name} order by l.starts_at limit 1`,
  );
  if (!row) throw new Error(`no student with a lesson named ${name}`);
  return { studentId: row.student_id, lessonId: row.lesson_id };
}

/** The student's newest package: its id, size and currency. */
export async function newestPackage(studentId: string): Promise<{ id: string; lessons_total: number; currency: string }> {
  const [row] = await withSql(
    (sql) => sql<{ id: string; lessons_total: number; currency: string }[]>`
    select id, lessons_total, currency from public.subscriptions
    where student_id = ${studentId} and status <> 'trial' and package is distinct from 'trial' order by created_at desc limit 1`,
  );
  if (!row) throw new Error('no package');
  return row;
}
