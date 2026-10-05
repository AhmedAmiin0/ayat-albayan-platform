import type { Browser, Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { BOARD, boardInk, drawStroke, expectConnected, LIVE, MEDIA_FLAGS, newMeeting, roomPage, shot } from '../support/classroom-live';

// Mute and «اطلب الكتابة على السبورة» against a real LiveKit (owner, 2026-10-05), next to
// classroom-live.spec.ts (split for the 150-line rule). Skipped without LIVEKIT_URL.

const C = ar.classroom;
const M = C.mute;
const BR = C.boardRequest;

test.use({ launchOptions: { args: MEDIA_FLAGS } });
test.skip(!LIVE, 'needs a LiveKit server (LIVEKIT_URL)');

/** The admin's meeting with the teacher (signed in, via the link) and a guest «سهيلة». */
async function teacherAndGuest(browser: Browser, title: string): Promise<{ teacher: Page; guest: Page }> {
  const admin = await roomPage(browser, 'admin');
  const link = await newMeeting(admin, `${title} ${Date.now() % 1e5}`);
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
  return { teacher, guest };
}

test('the teacher mutes a guest: the guest’s mic goes off and they are told', async ({ browser }) => {
  test.setTimeout(120_000);
  const { teacher, guest } = await teacherAndGuest(browser, 'كتم');
  await expect(guest.getByRole('button', { name: C.micOff })).toBeVisible();

  await teacher.getByRole('button', { name: M.micOf.replace('{name}', 'سهيلة') }).click();
  await expect(guest.getByText(M.byStaff)).toBeVisible({ timeout: 15_000 });
  await expect(guest.getByRole('button', { name: C.micOn })).toBeVisible();
  const tile = teacher.getByRole('listitem', { name: 'سهيلة', exact: true });
  await expect(tile.getByText(C.muted)).toBeVisible({ timeout: 15_000 });
  await shot(teacher, 'teacher-muted-guest');
  await shot(guest, 'guest-muted');

  // The guest may turn it back on themselves.
  await guest.getByRole('button', { name: C.micOn }).click();
  await expect(tile.getByText(C.muted)).toHaveCount(0, { timeout: 15_000 });
  await teacher.context().close();
  await guest.context().close();
});

test('a guest asks to write on the board, the teacher allows it, the stroke reaches the teacher', async ({ browser }) => {
  test.setTimeout(120_000);
  const { teacher, guest } = await teacherAndGuest(browser, 'سبورة');

  await guest.getByRole('button', { name: BR.open.request }).click();
  const openAsk = teacher.getByRole('alert').filter({ hasText: BR.open.asks.replace('{name}', 'سهيلة') });
  await openAsk.getByRole('button', { name: C.shareRequest.allow }).click();
  await expect(guest.getByText(BOARD.readOnly)).toBeVisible({ timeout: 15_000 });

  await guest.getByRole('button', { name: BR.draw.request }).click();
  const ask = teacher.getByRole('alert').filter({ hasText: BR.draw.asks.replace('{name}', 'سهيلة') });
  await expect(ask).toBeVisible();
  await shot(teacher, 'teacher-draw-request');
  await ask.getByRole('button', { name: C.shareRequest.allow }).click();
  await expect(guest.getByText(BR.draw.allowed)).toBeVisible({ timeout: 15_000 });
  await expect(guest.getByRole('button', { name: BOARD.pen })).toBeVisible();

  expect(await boardInk(teacher)).toBe(0);
  await drawStroke(guest);
  await expect.poll(() => boardInk(teacher), { timeout: 10_000 }).toBeGreaterThan(50);
  await shot(teacher, 'teacher-sees-guest-stroke');

  await teacher.getByRole('button', { name: BR.draw.stop.replace('{name}', 'سهيلة') }).click();
  await expect(guest.getByText(BOARD.readOnly)).toBeVisible({ timeout: 15_000 });
  await teacher.context().close();
  await guest.context().close();
});
