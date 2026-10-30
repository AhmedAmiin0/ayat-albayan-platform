import { ar, expect, test } from '../support/fixtures';
import { openThread } from '../support/messaging/inbox';
import { freshDigits } from '../support/messages';
import { withSql } from '../support/schedule';
import { stubInbound, stubReset } from '../support/wa-stub';
import { sidePanel } from '../support/messaging/thread-panel';

// «تسجيل الطالب» from the thread's short aside (R-LEAD-06, R-STU-02): the essentials pre-filled
// from the lead, the thread's number as the guardian's; the lead is converted and linked to the
// new guardian, and the aside becomes the family's panel. Messaging stays off (nothing sent).

const exact = { exact: true } as const;

type Row = { status: string; linked: boolean; students: string[] };
const stateOf = (phone: string) => withSql((sql) => sql<Row[]>`
  select l.status::text as status, l.converted_guardian_id = g.id as linked,
    coalesce((select array_agg(s.name) from public.students s where s.guardian_id = g.id), '{}') as students
  from public.leads l left join public.guardians g on g.phone_e164 = l.phone_e164
  where l.phone_e164 = ${phone}`).then((rows) => rows[0]);

test.describe('register the student from the inbox (R-LEAD-06)', () => {
  test.beforeEach(async () => {
    await stubReset();
  });

  test('pre-filled modal → student under the thread’s number, lead converted and linked', async ({ asRole }) => {
    test.setTimeout(90_000);
    const digits = freshDigits();
    const phone = `+${digits}`;
    const name = `أم يوسف ${digits.slice(-4)}`;
    expect((await stubInbound({ from: digits, name, text: 'أريد تسجيل ابني' })).status).toBe(200);
    const admin = await asRole('admin');
    await openThread(admin, name);
    const panel = await sidePanel(admin, 'lead');
    await panel.getByRole('button', { name: ar.inbox.registerStudent, exact: true }).click({ timeout: 30_000 });

    const dialog = admin.getByRole('dialog', { name: ar.inbox.registerStudent });
    await expect(dialog.getByLabel(ar.guardians.phone, exact)).toHaveValue(phone);
    await expect(dialog.getByLabel(ar.guardians.name, exact)).toHaveValue(name);
    await expect(dialog.getByLabel(ar.students.program, exact)).toHaveCount(0);
    await dialog.getByLabel(ar.leads.studentName, exact).fill('يوسف');
    await dialog.getByLabel(ar.students.age, exact).fill('8');
    await dialog.getByRole('button', { name: ar.common.save, exact: true }).click();

    await expect(admin.getByRole('status')).toHaveText(ar.students.created);
    await expect(dialog).toBeHidden();
    await expect(admin.getByRole('complementary', { name: ar.inbox.subscription.title })).toBeVisible({ timeout: 30_000 });
    expect(await stateOf(phone)).toEqual({ status: 'converted', linked: true, students: ['يوسف'] });
  });
});
