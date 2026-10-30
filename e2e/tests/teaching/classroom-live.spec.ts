import { ar, expect, test } from '../../support/core/fixtures';
import { BOARD, boardInk, drawStroke, expectConnected, LIVE, MEDIA_FLAGS, newMeeting, roomPage, shot, videoWidth } from '../../support/teaching/classroom-live';

// The classroom against a real LiveKit (owner, 2026-10-05: «السبورة ومشاركة الشاشة لا تعملان»). Runs only
// with LIVEKIT_URL (+ key/secret) in the env, e.g. `docker run … livekit/livekit-server --dev` and
// LIVEKIT_URL=ws://localhost:7880 LIVEKIT_API_KEY=devkey LIVEKIT_API_SECRET=secret; skipped in CI.
// Root cause it guards: a signed-in teacher who opened the shared /m/<token> link joined as a guest.

const C = ar.classroom;
const SR = C.shareRequest;
const ADMIN = 'مدير الاختبار';

test.use({ launchOptions: { args: MEDIA_FLAGS } });
test.skip(!LIVE, 'needs a LiveKit server (LIVEKIT_URL)');

test('staff via the shared link: connected, the pen, strokes, board share, screen share, maximise', async ({ browser }) => {
  test.setTimeout(120_000);
  const admin = await roomPage(browser, 'admin');
  const link = await newMeeting(admin, `سبورة ${Date.now() % 1e5}`);
  const teacher = await roomPage(browser, 'teacher');
  await teacher.goto(link); // the WhatsApp'd link, opened while signed in
  await teacher.waitForURL(/\/meeting\/[0-9a-f-]{36}$/);
  await expectConnected(admin, 2);
  await expectConnected(teacher, 2);

  await admin.getByRole('button', { name: BOARD.toggle, exact: true }).click();
  for (const page of [admin, teacher]) {
    await expect(page.getByRole('button', { name: BOARD.pen })).toBeVisible();
    await expect(page.getByText(BOARD.readOnly)).toHaveCount(0);
  }
  expect(await boardInk(teacher)).toBe(0);
  await drawStroke(admin);
  await expect.poll(() => boardInk(teacher), { timeout: 10_000 }).toBeGreaterThan(50);
  await shot(admin, 'admin-board');
  await shot(teacher, 'teacher-board');

  await admin.getByRole('button', { name: BOARD.toggle, exact: true }).click(); // closes it for everyone
  await expect(teacher.getByRole('img', { name: BOARD.title })).toHaveCount(0);

  // «شارك الشاشة» (fake capture), then the teacher maximises the shared screen and comes back.
  await admin.getByRole('button', { name: C.shareOn }).click();
  await expect(admin.getByRole('button', { name: C.shareOff })).toBeVisible();
  const screenTile = teacher.getByRole('listitem', { name: C.screenOf.replace('{name}', ADMIN) });
  await expect(screenTile).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => videoWidth(screenTile), { timeout: 15_000 }).toBeGreaterThan(0);
  await teacher.getByRole('button', { name: C.stage.maximize }).click();
  const stage = teacher.getByRole('button', { name: C.stage.minimize });
  await expect(stage).toBeVisible();
  const view = teacher.viewportSize();
  await expect.poll(async () => (await stage.boundingBox())?.width).toBeGreaterThanOrEqual((view?.width ?? 0) - 2);
  await shot(teacher, 'teacher-maximised');
  await stage.click();
  await expect(teacher.getByRole('button', { name: C.stage.maximize })).toBeVisible();
  await shot(teacher, 'teacher-screen-stage');
  await shot(admin, 'admin-sharing');
  await admin.context().close();
  await teacher.context().close();
});

test('a guest asks to share the screen, the teacher allows it, then stops it', async ({ browser }) => {
  test.setTimeout(120_000);
  const admin = await roomPage(browser, 'admin');
  const link = await newMeeting(admin, `طلب ${Date.now() % 1e5}`);
  await admin.context().close();
  const teacher = await roomPage(browser, 'teacher');
  await teacher.goto(link);
  await teacher.waitForURL(/\/meeting\//);
  const guest = await roomPage(browser, null);
  await guest.goto(link);
  await guest.getByLabel(new RegExp(C.guest.name)).fill('سهيلة');
  await guest.getByRole('button', { name: C.guest.join }).click();
  await expectConnected(guest, 2);
  await expectConnected(teacher, 2);

  await expect(guest.getByRole('button', { name: C.shareOn })).toHaveCount(0);
  await guest.getByRole('button', { name: SR.request }).click();
  await expect(guest.getByRole('button', { name: SR.pending })).toBeDisabled();
  const ask = teacher.getByRole('alert').filter({ hasText: SR.asks.replace('{name}', 'سهيلة') });
  await expect(ask).toBeVisible();
  await shot(teacher, 'teacher-share-request');
  await ask.getByRole('button', { name: SR.allow }).click();

  await expect(guest.getByText(SR.allowed)).toBeVisible({ timeout: 15_000 });
  await guest.getByRole('button', { name: C.shareOn }).click();
  await expect(guest.getByRole('button', { name: C.shareOff })).toBeVisible();
  await expect(teacher.getByRole('listitem', { name: C.screenOf.replace('{name}', 'سهيلة') })).toBeVisible({ timeout: 15_000 });
  await shot(teacher, 'teacher-sees-guest-screen');
  await shot(guest, 'guest-sharing');

  await teacher.getByRole('button', { name: SR.stop.replace('{name}', 'سهيلة') }).click();
  await expect(teacher.getByRole('listitem', { name: C.screenOf.replace('{name}', 'سهيلة') })).toHaveCount(0, { timeout: 15_000 });
  await expect(guest.getByRole('button', { name: SR.request })).toBeVisible();

  // «مشاركة السبورة»: the guest hides the board on their own screen and sees the teacher's shared board.
  await teacher.getByRole('button', { name: BOARD.toggle, exact: true }).click();
  await teacher.getByRole('button', { name: BOARD.shareOn }).click();
  await expect(teacher.getByRole('button', { name: BOARD.shareOff })).toBeVisible();
  await expect(guest.getByText(BOARD.readOnly)).toBeVisible();
  await guest.getByRole('button', { name: BOARD.toggle, exact: true }).click();
  await expect(guest.getByRole('listitem', { name: C.boardOf.replace('{name}', 'أبرار') })).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => videoWidth(guest.locator('[data-maximized]'))).toBeGreaterThan(0);
  await shot(guest, 'guest-sees-board-share');
  await teacher.context().close();
  await guest.context().close();
});
