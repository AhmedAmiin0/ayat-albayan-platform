import type { Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, seedFamily, seedLesson, setAvailability, withSql } from '../support/schedule';
// A makeup is per student (R-SCH-10, migration 173): in a group lesson both children can get theirs, and the
// lesson says which one is booked. The device upload and the replace/error states of the invoice field are
// unit-tested (InvoiceField.replace.test.tsx).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const next = (p: Page) => p.getByRole('button', { name: ar.booking.next }).click();
const stamp = () => String(Date.now()).slice(-3);

/** The makeup wizard of one child of the missed group lesson, up to «احجز». */
async function bookMakeup(admin: Page, o: { child: string; late: boolean }): Promise<void> {
  await admin.getByRole('dialog').getByRole('link', { name: `${ar.booking.makeup.action} · ${o.child}` }).click();
  for (let i = 0; i < 3; i += 1) await next(admin); // type + student, missed lesson, teacher
  const step = admin.getByRole('region', { name: ar.booking.steps.slot });
  await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
  const slots = step.getByRole('region', { name: new RegExp(`^${ar.enums.weekday['0']} `) }).getByRole('button');
  await (o.late ? slots.last() : slots.first()).click(); // the second child takes the last slot: the first child has 16:00
  await next(admin);
  await admin.getByLabel(ar.booking.invoice.upload).setInputFiles({ name: 'inv.png', mimeType: 'image/png', buffer: PNG });
  await expect(admin.getByRole('button', { name: ar.booking.invoice.remove })).toBeVisible();
  await next(admin);
  await admin.getByRole('button', { name: ar.booking.submit }).click();
  await expect(admin.getByRole('heading', { name: ar.booking.makeup.booked })).toBeVisible();
}

test('a group lesson: both children get their own makeup, and the drawer says which is booked', async ({ asRole }) => {
  test.setTimeout(200_000);
  const teacherId = await resetAbrar();
  await setAvailability(teacherId, [[0, '16:00', '18:00']]);
  const [a, b] = [`سلمى${stamp()}`, `جود${stamp()}`];
  const { studentIds } = await seedFamily(`أم ${a}`, [a, b]);
  const [sa, sb] = studentIds as [string, string];
  const day = addDays(nextWeekSaturday(), -8);
  const missed = await seedLesson({ teacherId, studentId: sa, startsAt: riyadh(day, '17:00'), minutes: 45 });
  await withSql((sql) => sql`with r as (insert into public.schedule_rules (teacher_id, duration_min, start_time_local, tz, byday, starts_on, package)
      values (${teacherId}, '45', '17:00', 'Asia/Riyadh', '{5}', ${day}, '8') returning id),
    rs as (insert into public.schedule_rule_students (rule_id, student_id) select id, x::uuid from r, unnest(array[${sa}, ${sb}]) x),
    ls as (insert into public.lesson_students (lesson_id, student_id) values (${missed}, ${sb}))
    update public.lessons set status = 'no_show', rule_id = (select id from r) where id = ${missed}`);
  const admin = await asRole('admin');
  const open = async () => {
    await admin.goto(`/admin/schedule?week=${addDays(nextWeekSaturday(), -14)}&teacher=${teacherId}`);
    await admin.getByRole('button', { name: new RegExp(a) }).click();
    await expect(admin.getByRole('dialog')).toBeVisible();
  };
  await open();
  await bookMakeup(admin, { child: a, late: false });
  await open();
  const drawer = admin.getByRole('dialog');
  await expect(drawer.getByRole('link', { name: `${ar.booking.makeup.action} · ${a}` })).toHaveCount(0);
  await expect(drawer.getByText(new RegExp(`^${a}: `))).toBeVisible();
  await bookMakeup(admin, { child: b, late: true });
  expect(await withSql((sql) => sql`select makeup_student_id from public.lessons where makeup_of_id = ${missed}`)).toHaveLength(2);
  await open();
  await expect(admin.getByRole('dialog').getByRole('link', { name: new RegExp(ar.booking.makeup.action) })).toHaveCount(0);
});
