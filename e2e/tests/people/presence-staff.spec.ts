import { ar, expect, test } from '../../support/core/fixtures';
import { USERS } from '../../support/core/users';

// docs/33: the admin's «حالة الفريق» on «المستخدمون» shows a signed-in staff member online.
// CI's e2e stack runs without Realtime, so «متصل الآن» here comes from the API's throttled last
// seen (the teacher's own requests, under PRESENCE_RECENT_MS old): the write, the admin-only read
// and the display, end to end.

test.describe('presence: the admin staff list', () => {
  test('a teacher who just used the app shows «متصل الآن»', async ({ asRole }) => {
    const teacher = await asRole('teacher');
    await teacher.goto('/teacher');
    // Any authenticated API call marks the teacher seen.
    await expect(teacher.getByRole('main')).toBeVisible();

    const admin = await asRole('admin');
    const panel = admin.getByRole('region', { name: ar.presence.staffTitle });
    const row = panel.getByRole('listitem').filter({ hasText: USERS.teacher.fullName });
    // The API writes last seen in batches every 15 s: reload until the teacher's write landed.
    await expect(async () => {
      await admin.goto('/admin/users');
      await expect(row).toContainText(ar.presence.online, { timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    await expect(panel).toContainText(ar.presence.staffOnline.replace('{n}', ''));
  });
});
