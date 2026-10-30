import { ar, expect, test } from '../../support/core/fixtures';
import { resetAbrar, withSql } from '../../support/core/schedule';

// «مستحقات المعلم» (admin) and «أرباحي» (teacher), owner 2026-10-05: a completed lesson is owed,
// the admin pays it, then voids the payment with a reason — the payment stays in the history
// struck through and the lesson is owed again; the teacher sees the same in «أرباحي».

async function setup(): Promise<{ teacherId: string; lessonId: string }> {
  const teacherId = await resetAbrar();
  return withSql(async (sql) => {
    await sql`update public.teachers set rate_30 = 50, rate_45 = 70, rate_60 = 90 where id = ${teacherId}`;
    const start = new Date(Math.floor((Date.now() - 3 * 86_400_000) / 3_600_000) * 3_600_000);
    const [l] = await sql<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at, status)
      values (${teacherId}, ${start.toISOString()}, ${new Date(start.getTime() + 45 * 60_000).toISOString()}, 'completed')
      returning id`;
    if (!l) throw new Error('lesson not written');
    return { teacherId, lessonId: l.id };
  });
}

const paidOf = (lessonId: string) =>
  withSql(async (sql) => {
    const [e] = await sql<{ paid: number; status: string }[]>`
      select paid_amount::float as paid, status::text as status from public.teacher_session_earnings where lesson_id = ${lessonId}`;
    return e;
  });

test.describe('teacher earnings pages', () => {
  test('admin pays a session, voids the payment with a reason; the teacher sees «أرباحي»', async ({ asRole }) => {
    const { teacherId, lessonId } = await setup();
    const admin = await asRole('admin');
    await admin.goto(`/admin/teachers/${teacherId}/earnings`);
    await admin.getByRole('button', { name: ar.earnings.pay, exact: true }).click();
    const pay = admin.getByRole('dialog');
    await pay.getByRole('button', { name: ar.earnings.confirm }).click();
    await expect(admin.getByRole('status')).toHaveText(ar.earnings.saved);
    expect(await paidOf(lessonId)).toEqual({ paid: 70, status: 'paid' });

    // Void: a reason is required; the payment stays listed, struck through; the lesson is owed again.
    const history = admin.getByRole('region', { name: ar.earnings.history });
    await history.getByRole('button', { name: ar.finance.voidPayment }).click();
    const confirm = admin.getByRole('dialog', { name: ar.finance.voidTitle });
    await confirm.getByLabel(ar.finance.reason).fill('حُوّل لمعلم آخر');
    await confirm.getByRole('button', { name: ar.finance.voidPayment }).click();
    await expect(history.getByText(ar.finance.voided.replace('{reason}', 'حُوّل لمعلم آخر'))).toBeVisible();
    await expect(history.getByRole('button', { name: ar.finance.voidPayment })).toHaveCount(0);
    expect(await paidOf(lessonId)).toEqual({ paid: 0, status: 'earned' });

    const teacher = await asRole('teacher');
    await teacher.goto('/teacher/earnings');
    await expect(teacher.getByRole('heading', { name: ar.earnings.mineTitle })).toBeVisible();
    await expect(teacher.getByText(ar.finance.voided.replace('{reason}', 'حُوّل لمعلم آخر'))).toBeVisible();
    await expect(teacher.getByRole('button', { name: ar.finance.voidPayment })).toHaveCount(0);
    await teacher.getByRole('link', { name: ar.earnings.monthly }).first().click();
    await expect(teacher).toHaveURL(/\/teacher\/payouts$/);
  });

  test('«مستحقات المعلمين» lists what each teacher is owed and opens their page', async ({ asRole }) => {
    const { teacherId } = await setup();
    const admin = await asRole('admin');
    await admin.goto('/admin/payouts');
    const dues = admin.getByRole('region', { name: ar.finance.duesTitle });
    await expect(dues).toContainText('70');
    await dues.getByRole('link', { name: 'أبرار' }).click();
    await expect(admin).toHaveURL(new RegExp(`/admin/teachers/${teacherId}/earnings$`));
  });
});
