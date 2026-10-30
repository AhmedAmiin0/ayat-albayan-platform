import type { Locator, Page } from '@playwright/test';
import { ar, expect } from '../fixtures';
import { seedPackageStudent, type PackageSeed } from '../finance/money';
import { addDays, withSql } from '../schedule';

// Helpers of the cancel / series / stale / proposal-reject / booking-override / group specs.
// Riyadh is UTC+3 all year, so wall clocks convert with a fixed offset.

const HOUR = 3_600_000;
const WEEK_MS = 7 * 24 * HOUR;

/** The Riyadh calendar day (YYYY-MM-DD) of an instant. */
export function riyadhDay(at: Date): string {
  return new Date(at.getTime() + 3 * HOUR).toISOString().slice(0, 10);
}

/** Saturday that starts the Riyadh week (السبت → الجمعة) holding an instant. */
export function weekOf(at: Date): string {
  const shifted = new Date(at.getTime() + 3 * HOUR);
  return addDays(riyadhDay(at), -((shifted.getUTCDay() + 1) % 7));
}

/** Pick this week's grid on a phone (day list) or a desktop (table). */
export function weekGrid(page: Page): Locator {
  return page.getByRole('table', { name: ar.schedule.grid }).or(page.getByRole('group', { name: ar.schedule.grid }));
}

/** settings.late_cancel_hours: a number of hours, or null = OFF (the seeded default). */
export async function setLateCancelHours(hours: number | null): Promise<void> {
  // null removes the row, as PATCH /settings does (the column is not null); a number is stored as a jsonb number.
  await withSql((sql) => hours === null
    ? sql`delete from public.settings where key = 'late_cancel_hours'`
    : sql`
    insert into public.settings (key, value) values ('late_cancel_hours', ${sql.json(hours)})
    on conflict (key) do update set value = excluded.value`);
}

interface RuleSeed {
  teacherId: string;
  studentIds: string[];
  /** First lesson; the rule repeats weekly at its Riyadh wall clock. */
  firstStart: Date;
  weeks: number;
  minutes: 45 | 60;
}

/** A weekly package rule with `weeks` generated lessons, the way booking leaves it. */
export async function seedWeeklyRule(r: RuleSeed): Promise<{ ruleId: string; lessonIds: string[] }> {
  const day = riyadhDay(r.firstStart);
  const clock = new Date(r.firstStart.getTime() + 3 * HOUR).toISOString().slice(11, 16);
  const weekday = new Date(r.firstStart.getTime() + 3 * HOUR).getUTCDay();
  const last = riyadhDay(new Date(r.firstStart.getTime() + (r.weeks - 1) * WEEK_MS));
  return withSql(async (sql) => {
    const [rule] = await sql<{ id: string }[]>`
      insert into public.schedule_rules (teacher_id, duration_min, start_time_local, tz, byday, starts_on, ends_on, package, meeting_link)
      values (${r.teacherId}, ${String(r.minutes)}, ${clock}, 'Asia/Riyadh', ${`{${weekday}}`}, ${day}, ${last}, '4',
        'https://meet.jit.si/ayat-e2e-abrar') returning id`;
    if (!rule) throw new Error('rule not written');
    for (const studentId of r.studentIds) {
      await sql`insert into public.schedule_rule_students (rule_id, student_id) values (${rule.id}, ${studentId})`;
    }
    const lessonIds: string[] = [];
    for (let i = 0; i < r.weeks; i += 1) {
      const startsAt = new Date(r.firstStart.getTime() + i * WEEK_MS);
      const [row] = await sql<{ id: string }[]>`
        insert into public.lessons (rule_id, teacher_id, starts_at, ends_at, meeting_link)
        values (${rule.id}, ${r.teacherId}, ${startsAt}, ${new Date(startsAt.getTime() + r.minutes * 60_000)},
          'https://meet.jit.si/ayat-e2e-abrar') returning id`;
      if (!row) throw new Error('lesson not written');
      for (const studentId of r.studentIds) {
        await sql`insert into public.lesson_students (lesson_id, student_id) values (${row.id}, ${studentId})`;
      }
      lessonIds.push(row.id);
    }
    return { ruleId: rule.id, lessonIds };
  });
}

/** A paid package student (3 of 4 left) whose only open lesson is the one the spec seeds later. */
export async function seedPaidStudent(input: { teacherId: string; guardian: string; student: string }): Promise<PackageSeed> {
  const seed = await seedPackageStudent({ ...input, paid: true });
  await withSql((sql) => sql`delete from public.lessons where id = ${seed.todayLessonId}`);
  return seed;
}

interface CancelState {
  status: string;
  cancel_reason: string | null;
  chargeable: boolean;
}

/** What a cancel left on the lesson and on its (first) student row. */
export async function cancelStateOf(lessonId: string): Promise<CancelState | undefined> {
  return withSql(async (sql) => {
    const [row] = await sql<CancelState[]>`
      select l.status, l.cancel_reason, ls.chargeable from public.lessons l
      join public.lesson_students ls on ls.lesson_id = l.id where l.id = ${lessonId}`;
    return row;
  });
}

interface RuleState {
  status: string;
  ends_on: string | null;
}

/** schedule_rules.status and ends_on (a rule ending in the future stays active until then). */
export async function ruleStateOf(ruleId: string): Promise<RuleState | undefined> {
  return withSql(async (sql) => {
    const [row] = await sql<RuleState[]>`
      select status::text as status, ends_on::text as ends_on from public.schedule_rules where id = ${ruleId}`;
    return row;
  });
}

/**
 * Opens the week's lesson chip of a student: the drawer is the dialog named after them. A seeded
 * student also has a completed lesson three days back, which lands in the same Riyadh week from
 * Tuesday on: `at` picks the chip showing that Riyadh wall clock instead of the first one.
 */
export async function openLessonDrawer(page: Page, input: { week: string; teacherId: string; name: string; at?: Date }): Promise<Locator> {
  await page.goto(`/admin/schedule?week=${input.week}&teacher=${input.teacherId}`);
  const chips = weekGrid(page).getByRole('button', { name: new RegExp(input.name) });
  const clock = input.at && new Date(input.at.getTime() + 3 * HOUR).toISOString().slice(11, 16);
  await (clock ? chips.filter({ hasText: clock }) : chips).first().click();
  const drawer = page.getByRole('dialog', { name: input.name });
  await expect(drawer).toBeVisible();
  return drawer;
}
