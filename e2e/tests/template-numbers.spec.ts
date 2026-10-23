import type { Page } from '@playwright/test';
import { makeAssistant } from '../support/assistant-api';
import { ar, expect, test } from '../support/fixtures';
import { listedKeys } from '../support/restricted-templates';
import { CHAT_WABA, RESCHEDULE, rescheduleRow, seedReschedule } from '../support/reschedule-template';
import { withSql } from '../support/schedule';
import { numberBlock, syncNumber } from '../support/template-numbers';
import { restoreTemplates, snapshotTemplates, stubTemplates, type TemplateRow } from '../support/template-registry';
import { SINGLE_LINE } from '../support/wa-lines';
import { stubReset, stubTemplateStatus } from '../support/wa-stub';

// Templates per number (owner 2026-10-18): each number syncs on its own, a template moves to the other
// number, trial_reschedule is submitted to the chat number's WABA and, once «Meta» (the stub) approves
// it there, a restricted role lists all three defaults.

const t = ar.templates;
const p = t.perNumber;
const chat = ar.enums.waLine.chat;
const notifications = ar.enums.waLine.notifications;
const NAME = t.names.trial_reschedule;
const row = (page: Page) => page.getByRole('row').filter({ hasText: NAME });

async function openSettings(page: Page): Promise<void> {
  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: t.title })).toBeVisible();
}

const lineOf = async (key: string) =>
  withSql(async (sql) => (await sql<{ line: string }[]>`select line from public.message_templates where key = ${key}`)[0]?.line);

test.describe('templates per number (owner 2026-10-18)', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat number to sync, move to or submit to');
  let saved: TemplateRow[] = [];
  test.beforeEach(async () => {
    saved = await snapshotTemplates();
    await stubReset();
    await seedReschedule();
  });
  test.afterEach(async () => {
    await withSql((sql) => sql`update public.message_templates set line = 'notifications' where key = 'booking_confirmation'`);
    await restoreTemplates(saved);
    await seedReschedule();
    await stubReset();
  });

  test('the chat number syncs alone and shows what it found; the notifications rows are not touched', async ({ asRole }) => {
    const before = await withSql((sql) => sql<{ last_checked_at: Date | null }[]>`
      select last_checked_at from public.message_templates where key = 'booking_confirmation'`);
    const admin = await asRole('admin');
    await openSettings(admin);
    // The boot sync may already have filled the notifications block: it must not change now.
    const notif = numberBlock(admin, 'notifications');
    await expect(notif).toContainText(p.provider);
    const notifBefore = await notif.innerText();
    await syncNumber(admin, 'chat');
    const block = numberBlock(admin, 'chat');
    await expect(block).toContainText(p.metaCount);
    await expect(block).toContainText(p.lastSync.replace('{time}', '').trim());
    expect(await notif.innerText()).toBe(notifBefore);
    const after = await withSql((sql) => sql<{ last_checked_at: Date | null }[]>`
      select last_checked_at from public.message_templates where key = 'booking_confirmation'`);
    expect(after).toEqual(before);
  });

  test('a template moves to the other number after the confirm; a producer’s confirm warns first', async ({ asRole }) => {
    const admin = await asRole('admin');
    await openSettings(admin);
    await admin.getByRole('button', { name: t.moveFor.replace('{name}', t.names.booking_confirmation) }).click();
    const warn = admin.getByRole('dialog', { name: t.moveTitle });
    await expect(warn.getByRole('note')).toHaveText(t.moveProducerWarning);
    await warn.getByRole('button', { name: ar.common.cancel }).click();
    expect(await lineOf('booking_confirmation')).toBe('notifications');

    await row(admin).getByRole('button', { name: t.moveFor.replace('{name}', NAME) }).click();
    const dialog = admin.getByRole('dialog', { name: t.moveTitle });
    await expect(dialog.getByRole('note')).toHaveCount(0);
    await dialog.getByRole('button', { name: t.moveYes }).click();
    await expect(admin.getByText(t.moved.replace('{line}', notifications))).toBeVisible();
    await expect(row(admin)).toContainText(notifications);
    expect(await rescheduleRow()).toMatchObject({ line: 'notifications', status: 'not_submitted' });
  });

  test('trial_reschedule is submitted to the chat number’s WABA; approved there, a restricted role lists it', async ({ asRole }) => {
    const admin = await asRole('admin');
    await openSettings(admin);
    await row(admin).getByRole('button', { name: t.submit }).click();
    const dialog = admin.getByRole('dialog', { name: t.submit });
    await expect(dialog).toContainText(t.submitTarget);
    await expect(dialog).toContainText(chat);
    await dialog.getByRole('button', { name: t.submitConfirmYes }).click();
    await expect(admin.getByText(t.submitted)).toBeVisible();
    expect(await rescheduleRow()).toMatchObject({ line: 'chat', status: 'pending' });
    const meta = (await stubTemplates()).filter((m) => m.name === RESCHEDULE) as unknown as { wabaId?: string }[];
    expect(meta.map((m) => m.wabaId)).toEqual([CHAT_WABA]);

    await stubTemplateStatus(RESCHEDULE, 'APPROVED', CHAT_WABA);
    await syncNumber(admin, 'chat');
    await expect(row(admin)).toContainText(ar.enums.templateStatus.approved);
    const me = await makeAssistant(`tn${test.info().project.name}`);
    expect(await listedKeys(me.token)).toContain(RESCHEDULE);
  });
});
