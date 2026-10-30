import { ar, expect, test } from '../../support/fixtures';
import { BOARD, boardInk, expectConnected, LIVE, MEDIA_FLAGS, newMeeting, pageScrollWidth, roomPage, shot, touchStroke } from '../../support/teaching/classroom-live';

// The live classroom on a phone (390×844, touch), against a real LiveKit: see classroom-live.spec.ts.

const C = ar.classroom;
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 };

test.use({ launchOptions: { args: MEDIA_FLAGS } });
test.skip(!LIVE, 'needs a LiveKit server (LIVEKIT_URL)');

test('phone: the teacher draws with a finger, the tools and the control bar stay on screen', async ({ browser }) => {
  test.setTimeout(90_000);
  const admin = await roomPage(browser, 'admin');
  const link = await newMeeting(admin, `هاتف ${Date.now() % 1e5}`);
  const phone = await roomPage(browser, 'teacher', PHONE);
  await phone.goto(link);
  await phone.waitForURL(/\/meeting\//);
  await expectConnected(phone, 2);

  await phone.getByRole('button', { name: BOARD.toggle, exact: true }).click();
  await expect(phone.getByRole('button', { name: BOARD.pen })).toBeInViewport();
  await expect(phone.getByText(BOARD.readOnly)).toHaveCount(0);
  const canvas = phone.getByRole('img', { name: BOARD.title });
  await expect(canvas).toHaveCSS('touch-action', 'none');
  await touchStroke(phone);
  await expect.poll(() => boardInk(phone)).toBeGreaterThan(50);
  await expect.poll(() => boardInk(admin), { timeout: 10_000 }).toBeGreaterThan(50);

  const bar = phone.getByRole('toolbar', { name: C.controls });
  await expect(bar).toBeInViewport({ ratio: 1 });
  await expect(phone.getByRole('button', { name: C.leave })).toBeInViewport();
  expect(await pageScrollWidth(phone)).toBeLessThanOrEqual(390);
  await shot(phone, 'phone-board');
  await shot(admin, 'admin-sees-phone-stroke');
  await admin.context().close();
  await phone.context().close();
});
