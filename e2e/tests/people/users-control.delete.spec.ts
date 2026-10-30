import { seedUser } from '../../support/core/db';
import { ar, expect, test } from '../../support/core/fixtures';
import { withSql } from '../../support/core/schedule';
import { dropLogins, openUser, profileOf, stamp } from '../../support/people/users-control';

// «المستخدمون»: a user without history is deleted for good; one with history (a student it
// created, students.created_by) is refused, the tables are listed and «تعطيل بدلًا من الحذف» disables it instead.

const RUN = stamp();
const PLAIN = { email: `plain-${RUN}@e2e.local`, password: `Plain-e2e-${RUN}`, fullName: `بلا سجل ${RUN}` };
const BUSY = { email: `busy-${RUN}@e2e.local`, password: `Busy-e2e-${RUN}`, fullName: `ذات سجل ${RUN}` };
const D = ar.users.delete;

test.describe('users control: delete', () => {
  test.beforeAll(async () => {
    await seedUser({ ...PLAIN, role: 'assistant' });
    const busyId = await seedUser({ ...BUSY, role: 'teacher' });
    await withSql(async (sql) => {
      const [g] = await sql<{ id: string }[]>`insert into public.guardians (name, phone_e164, country, tz, created_by)
        values (${`ولي ${RUN}`}, ${`+9665${RUN.replace(/\D/g, '').padStart(8, '0').slice(-8)}`}, 'SA', 'Asia/Riyadh', ${busyId}) returning id`;
      await sql`insert into public.students (guardian_id, name, name_normalized, tz, created_by)
        values (${g?.id ?? null}, ${`طالب ${RUN}`}, ${`طالب ${RUN}`}, 'Asia/Riyadh', ${busyId})`;
    });
  });

  test.afterAll(async () => {
    await withSql(async (sql) => {
      await sql`delete from public.students where name = ${`طالب ${RUN}`}`;
      await sql`delete from public.guardians where name = ${`ولي ${RUN}`}`;
    });
    await dropLogins([PLAIN.email, BUSY.email]);
  });

  test('a user without history is deleted', async ({ asRole }) => {
    const page = await asRole('admin');
    const dialog = await openUser(page, PLAIN.fullName);
    await dialog.getByRole('button', { name: ar.users.actions.delete }).click();
    const confirm = page.getByRole('dialog', { name: D.title });
    await confirm.getByRole('button', { name: D.confirm }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByText(ar.users.toast.deleted)).toBeVisible();
    await expect(page.getByRole('button', { name: PLAIN.fullName, exact: true })).toHaveCount(0);
    expect(await profileOf(PLAIN.email)).toHaveLength(0);
  });

  test('a user with history is refused and can be disabled instead', async ({ asRole }) => {
    const page = await asRole('admin');
    const dialog = await openUser(page, BUSY.fullName);
    await dialog.getByRole('button', { name: ar.users.actions.delete }).click();
    const confirm = page.getByRole('dialog', { name: D.title });
    await confirm.getByRole('button', { name: D.confirm }).click();
    await expect(confirm.getByText(D.blocked)).toBeVisible();
    await expect(confirm.getByRole('button', { name: D.confirm })).toHaveCount(0);
    expect(await profileOf(BUSY.email)).toHaveLength(1);

    await confirm.getByRole('button', { name: D.disableInstead }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByText(ar.users.toast.disabled)).toBeVisible();
    await expect(page.getByText(ar.users.status.disabled)).toBeVisible();
    expect(await profileOf(BUSY.email)).toHaveLength(1);
  });
});
