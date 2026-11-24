import { execFileSync } from 'node:child_process';
import { seedUser, type SeedUser } from '../core/db';
import { withSql } from '../core/schedule';
import { USERS } from '../core/users';
import type { StoreFamily } from '../store/store.types';
import type { Seeded, StaffRole } from './screens.types.ts';

/** The two staff roles the e2e global setup does not create, made the same way. */
const EXTRA: Record<'sales' | 'assistant', SeedUser> = {
  sales: {
    email: 'sales@e2e.local',
    password: 'Sales-e2e-123',
    role: 'sales',
    fullName: 'سارة المبيعات',
  },
  assistant: {
    email: 'assistant@e2e.local',
    password: 'Assistant-e2e-123',
    role: 'assistant',
    fullName: 'هدى المساعدة',
  },
};

export const STAFF_USERS: Record<StaffRole, SeedUser> = { ...USERS, ...EXTRA };

export async function seedExtraRoles(): Promise<void> {
  for (const user of Object.values(EXTRA)) await seedUser(user);
}

/** `pnpm seed:demo`: the marked DEMO teachers, families, leads and applicants. */
export function seedDemo(): void {
  const root = new URL('../../../', import.meta.url).pathname;
  execFileSync('pnpm', ['seed:demo'], { cwd: root, stdio: 'inherit', env: process.env });
}

interface Rows {
  teacher_id: string;
  lesson_id: string;
  report_id: string;
  public_id: string;
  sales_id: string;
}

/** One short link and one internal meeting, so their detail pages have a row to open. */
async function seedLinkAndMeeting(salesId: string): Promise<{ code: string; meetingId: string }> {
  const code = 'DemoLink2026';
  return withSql(async (sql) => {
    await sql`insert into public.short_links (code, target_url, kind, subject)
      values (${code}, 'https://example.com/demo', 'demo', 'رابط تجريبي')
      on conflict (code) do nothing`;
    const [m] = await sql<{ id: string }[]>`insert into public.meetings (title, created_by)
      values ('اجتماع الفريق', ${salesId}) returning id`;
    if (!m) throw new Error('meeting not written');
    return { code, meetingId: m.id };
  });
}

/** The first row behind each detail route: the store family's first child and its report. */
export async function seededRows(family: StoreFamily): Promise<Seeded> {
  const [rows] = await withSql(
    (sql) => sql<Rows[]>`
    select r.teacher_id, r.lesson_id, r.id as report_id, r.public_id,
      (select p.id from public.profiles p join auth.users u on u.id = p.id
        where u.email = ${EXTRA.sales.email}) as sales_id
    from public.lesson_reports r join public.lessons l on l.id = r.lesson_id
    where r.student_id = ${family.first.id} order by l.starts_at desc limit 1`,
  );
  if (!rows) throw new Error('store family has no report');
  const extra = await seedLinkAndMeeting(rows.sales_id);
  return {
    studentId: family.first.id,
    teacherId: rows.teacher_id,
    lessonId: rows.lesson_id,
    reportId: rows.report_id,
    publicId: rows.public_id,
    assistantId: rows.sales_id,
    shortCode: extra.code,
    meetingId: extra.meetingId,
  };
}

/** The family logins' language: «en» for the LTR pass, unset (Arabic) otherwise. */
export async function familyLocale(locale: 'en' | null): Promise<void> {
  await withSql(
    (sql) => sql`update public.profiles set locale = ${locale}
    where role in ('guardian', 'student')`,
  );
}

export async function studentCode(studentId: string): Promise<string> {
  const [row] = await withSql(
    (sql) => sql<{ code: string }[]>`
    select code from public.students where id = ${studentId}`,
  );
  if (!row) throw new Error('student not found');
  return row.code;
}
