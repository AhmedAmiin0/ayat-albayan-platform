import type { Locator, Page } from '@playwright/test';
import { ar } from '../support/fixtures';
import { addDays, withSql } from '../support/schedule';

// Shared by edit-session-time*.spec.ts («عدّل الوقت», R-SCH-11). Not a spec: Playwright only runs *.spec.ts.

export const L = ar.lessons.timeEdit;
const TZ = 'Africa/Cairo';

/** The teacher's wall clock (the form is in her zone) of an instant. */
export function cairo(at: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/** The schedule week that holds `date`, the lesson's chip, then «عدّل الوقت». */
export async function openForm(page: Page, p: { date: string; teacherId: string; name: string }): Promise<Locator> {
  const week = addDays(p.date, -((new Date(`${p.date}T00:00:00Z`).getUTCDay() + 1) % 7));
  await page.goto(`/admin/schedule?week=${week}&teacher=${p.teacherId}`);
  const grid = page.getByRole('table', { name: ar.schedule.grid }).or(page.getByRole('group', { name: ar.schedule.grid }));
  await grid.getByRole('button', { name: new RegExp(p.name) }).click();
  const drawer = page.getByRole('dialog', { name: p.name });
  await drawer.getByRole('button', { name: ar.lessons.editTime }).click();
  return drawer;
}

export interface Pick {
  date?: string;
  time?: string;
  minutes?: string;
  reason?: string;
}

/** Day, time and length are picked (a native date, two selects); only the reason is typed. */
export async function fillForm(d: Locator, f: Pick) {
  if (f.date) await d.getByLabel(L.otherDate).fill(f.date);
  if (f.time) await d.getByLabel(/^الساعة بتوقيت/).selectOption(f.time);
  if (f.minutes) await d.getByLabel(L.duration, { exact: true }).selectOption(f.minutes);
  if (f.reason) await d.getByLabel(L.reason, { exact: true }).fill(f.reason);
}

export const save = (d: Locator) => d.getByRole('button', { name: L.submit }).click();

export type LessonRow = { id: string; status: string; starts_at: Date; ends_at: Date; override_reason: string | null };

export const lessonRows = (teacherId: string) =>
  withSql((sql) => sql<LessonRow[]>`
    select id, status, starts_at, ends_at, override_reason from public.lessons where teacher_id = ${teacherId} order by starts_at`);

/** e2e seeds auto_messages_enabled on (journey 3); an admin edit must queue its message even when off. */
export const autoMessages = (on: boolean) =>
  withSql((sql) => sql`update public.settings set value = ${String(on)}::jsonb where key = 'auto_messages_enabled'`);

export const auditOf = (lessonId: string) =>
  withSql((sql) => sql<{ before: { starts_at: string }; after: { mode: string; notified: number; reason: string | null } }[]>`
    select before, after from public.audit_log where entity = 'lessons' and entity_id = ${lessonId} and action = 'time_edit'`);
