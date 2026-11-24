import { ar, expect, test } from '../../support/core/fixtures';
import { withSql } from '../../support/core/schedule';
import { stubReset } from '../../support/core/wa-stub';
import { SINGLE_LINE } from '../../support/messaging/wa-lines';
import { closeCodes, openCodes } from '../../support/people/family-sign-in';
import { guardianSignIn, seedPortalFamily } from '../../support/people/family-portal';
import { LIVE, MEDIA_FLAGS, roomPage, shot } from '../../support/teaching/classroom-live';

// Family live room; needs LIVEKIT_URL, skipped in CI without it.

const R = ar.roomFlow;
const M = ar.mobileRoom;

test.use({ launchOptions: { args: MEDIA_FLAGS } });

test.describe('the family room on the family host', () => {
  test.skip(!LIVE, 'needs a LiveKit server (LIVEKIT_URL)');
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line, so no sign-in codes');
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'one browser: sign-in codes are rate limited');
    await stubReset();
    await openCodes();
  });
  test.afterEach(closeCodes);

  test('device check, waiting for the teacher, leave asks first, «رجوع» to the card', async ({ browser }) => {
    test.setTimeout(120_000);
    const family = await seedPortalFamily();
    // The running lesson without its own link: our classroom is the way in.
    await withSql((sql) => sql`update public.lessons set meeting_link = null
      where id in (select lesson_id from public.lesson_students where student_id = ${family.first.id})
        and starts_at <= now() and ends_at > now()`);
    const page = await roomPage(browser, null);
    await guardianSignIn(page, family.phone);
    const open = ar.portal.app.home.open.replace('{name}', family.first.name);
    await page.getByRole('article', { name: family.first.name }).getByRole('button', { name: open }).click();

    await page.getByRole('button', { name: ar.portal.join }).first().click();
    await expect(page.getByRole('heading', { name: R.check.title, exact: true })).toBeVisible();
    await shot(page, 'family-check');
    await page.getByRole('button', { name: M.preview.join, exact: true }).click();

    await expect(page.getByText(R.waiting.title)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(ar.classroom.error.classroom_not_configured)).toHaveCount(0);
    await shot(page, 'family-waiting');

    await page.getByRole('button', { name: ar.classroom.leave, exact: true }).click();
    const ask = page.getByRole('dialog', { name: M.leaveAsk.title });
    await ask.getByRole('button', { name: M.leaveAsk.stay, exact: true }).click();
    await expect(ask).toHaveCount(0);
    await page.getByRole('button', { name: ar.classroom.leave, exact: true }).click();
    await page.getByRole('dialog', { name: M.leaveAsk.title }).getByRole('button', { name: M.controls.leave }).click();
    await expect(page.getByText(ar.classroom.ended)).toBeVisible();
    await shot(page, 'family-left');

    await page.getByRole('button', { name: M.back, exact: true }).click();
    await expect(page.getByRole('button', { name: ar.portal.join }).first()).toBeVisible();
    await page.context().close();
  });
});
