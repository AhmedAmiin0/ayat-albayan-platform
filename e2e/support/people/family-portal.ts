import { normalizeArabic } from '@ab/core';
import type { Page } from '@playwright/test';
import { ar, expect } from '../core/fixtures';
import { FAMILY_URL } from '../core/family-host';
import { resetAbrar, withSql } from '../core/schedule';
import { seedPackageStudent } from '../finance/money';
import { codeSentTo, codesSent, post } from './family-sign-in';

// Family portal seed (docs/50): invented names only, a fresh family and phone per call.

const MINUTE = 60_000;
const DAY = 86_400_000;

interface PortalFamily {
  phone: string;
  first: { id: string; code: string; name: string };
  second: { id: string; name: string };
}

async function addLesson(input: {
  teacherId: string;
  studentId: string;
  startsAt: Date;
  outcome: { status: string; attendance: string | null };
}): Promise<void> {
  await withSql(async (sql) => {
    const endsAt = new Date(input.startsAt.getTime() + 45 * MINUTE);
    const [row] = await sql<{ id: string }[]>`
      insert into public.lessons (teacher_id, starts_at, ends_at, status, meeting_link)
      values (${input.teacherId}, ${input.startsAt}, ${endsAt}, ${input.outcome.status},
        'https://meet.jit.si/ayat-e2e-abrar') returning id`;
    if (!row) throw new Error('lesson not written');
    await sql`insert into public.lesson_students (lesson_id, student_id, attendance)
      values (${row.id}, ${input.studentId}, ${input.outcome.attendance})`;
  });
}

export async function seedPortalFamily(): Promise<PortalFamily> {
  const teacherId = await resetAbrar();
  const n = Date.now() % 10_000;
  const names = { first: `طالب البوابة ${n}`, second: `طالبة البوابة ${n}` };
  const guardian = `أسرة البوابة ${n}`;
  const seed = await seedPackageStudent({ teacherId, paid: true, guardian, student: names.first });
  const now = Date.now();
  const second = await withSql(async (sql) => {
    await sql`insert into public.lesson_reports
      (lesson_id, student_id, teacher_id, attendance, recited, homework, status, version,
        submitted_at, pdf_status, pdf_path, sent_at)
      values (${seed.pastLessonId}, ${seed.studentId}, ${teacherId}, 'on_time', 'سورة الملك',
        'مراجعة سورة الملك', 'submitted', 1, now(), 'ready', ${`e2e/${seed.studentId}.pdf`}, now())`;
    const [s] = await sql<{ id: string }[]>`
      insert into public.students (guardian_id, name, name_normalized, tz)
      values (${seed.guardianId}, ${names.second}, ${normalizeArabic(names.second)}, 'Asia/Riyadh') returning id`;
    if (!s) throw new Error('second child not written');
    return s.id;
  });
  const missed = { status: 'no_show', attendance: 'absent' };
  const booked = { status: 'scheduled', attendance: null };
  const fiveDaysAgo = new Date(now - 5 * DAY);
  await addLesson({ teacherId, studentId: seed.studentId, startsAt: fiveDaysAgo, outcome: missed });
  await addLesson({ teacherId, studentId: second, startsAt: new Date(now + DAY), outcome: booked });
  return withSql(async (sql) => {
    const [row] = await sql<{ phone: string; code: string }[]>`
      select g.phone_e164 as phone, s.code from public.students s join public.guardians g on g.id = s.guardian_id
      where s.id = ${seed.studentId}`;
    if (!row) throw new Error('family not written');
    const first = { id: seed.studentId, code: row.code, name: names.first };
    return { phone: row.phone, first, second: { id: second, name: names.second } };
  });
}

/** The guardian signs in on the family host with the phone on file and the stub's code. */
export async function guardianSignIn(page: Page, phone: string): Promise<void> {
  await page.goto(`${FAMILY_URL}/login`);
  await page.getByLabel(ar.familyAuth.phone).fill(phone);
  await page.getByRole('button', { name: ar.familyAuth.sendCode }).click();
  await expect(page.getByRole('heading', { name: ar.familyApp.signIn.codeTitle })).toBeVisible();
  const code = await codeSentTo(phone);
  // The sixth digit signs in on its own (no verify tap).
  await page.getByLabel(ar.familyAuth.codeDigit.replace('{n}', '1')).fill(code);
  await expect(page).toHaveURL(/\/portal/);
}

/** The child's first password (code to the guardian's phone), then the student code + password. */
export async function studentSignIn(page: Page, family: PortalFamily): Promise<void> {
  const password = `Child-e2e-${String(Date.now() % 100_000)}`;
  const before = await codesSent(family.phone);
  expect((await post('/auth/password/forgot', { identifier: family.first.code })).status).toBe(202);
  const code = await codeSentTo(family.phone, before);
  const reset = await post('/auth/password/reset', { identifier: family.first.code, code, password });
  expect(reset.status).toBe(204);
  await page.goto(`${FAMILY_URL}/login`);
  await page.getByRole('button', { name: ar.familyApp.signIn.withPassword }).click();
  await page.getByLabel(ar.familyApp.signIn.studentCode).fill(family.first.code);
  await page.getByLabel(ar.auth.password, { exact: true }).fill(password);
  await page.getByRole('button', { name: ar.auth.submit, exact: true }).click();
  await expect(page).toHaveURL(/\/portal/);
}
