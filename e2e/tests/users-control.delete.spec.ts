import { seedTeacherRow, seedUser } from '../support/db';
import { ar, expect, test } from '../support/fixtures';
import { withSql } from '../support/schedule';
import { dropLogins, openUser, profileOf, stamp } from '../support/users-control';

// «المستخدمون»: a user without history is deleted for good; one with history (a teacher row of
// its own) is refused, the tables are listed and «تعطيل بدلًا من الحذف» disables it instead.

const RUN = stamp();
const PLAIN = { email: `plain-${RUN}@e2e.local`, password: `Plain-e2e-${RUN}`, fullName: `بلا سجل ${RUN}` };
const BUSY = { email: `busy-${RUN}@e2e.local`, password: `Busy-e2e-${RUN}`, fullName: `ذات سجل ${RUN}` };
const D = ar.users.delete;

test.describe('users control: delete', () => {
  test.beforeAll(async () => {
    await seedUser({ ...PLAIN, role: 'assistant' });
    const busyId = await seedUser({ ...BUSY, role: 'teacher' });
    await seedTeacherRow(busyId, BUSY.fullName);
  });

  test.afterAll(async () => {
    await withSql((sql) => sql`delete from public.teachers where display_name_ar = ${BUSY.fullName}`);
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
