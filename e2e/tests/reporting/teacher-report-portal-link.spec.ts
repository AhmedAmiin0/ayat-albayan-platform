import { ar, expect, test } from '../../support/core/fixtures';
import { AR_LOCALE } from '../../support/core/locale';
import { resetAbrar } from '../../support/core/schedule';
import { USERS } from '../../support/core/users';
import { seedPackageStudent } from '../../support/finance/money';

// The report link opens /teacher-report/<lesson id>, which redirects to the signed-in report.

test('a signed-out teacher opens the sent report link, signs in, and lands on that report', async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const teacherId = await resetAbrar();
  const seed = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم سلمى', student: 'سلمى' });
  const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();

  await page.goto(`/teacher-report/${seed.todayLessonId}`);
  await expect(page).toHaveURL(/\/login\?redirect=/);
  const { email, password } = USERS.teacher;
  await page.getByLabel(ar.auth.email).fill(email);
  await page.getByLabel(ar.auth.password).fill(password);
  await page.getByRole('button', { name: ar.auth.submit }).click();

  await expect(page).toHaveURL(new RegExp(`/teacher/report/${seed.todayLessonId}$`));
  await expect(page.getByRole('region', { name: ar.reports.identity })).toBeVisible();
  await page.context().close();
});
