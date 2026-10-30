import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { syncNumber } from '../../support/messaging/template-numbers';
import {
  restoreTemplates, setTemplateStatus, snapshotTemplates, stubTemplates, templateRow, type TemplateRow,
} from '../../support/messaging/template-registry';
import { stubReset, stubTemplateStatus } from '../../support/wa-stub';

// Template registry on «التواصل» › «القوالب» (/admin/settings/communications?tab=templates; R-MSG-01, T2/T3): the health check reads «Meta» (the
// wa-stub), a paused template needs attention, a missing one and the document-header report_ready
// are submitted only after the confirm dialog (report_ready via the Resumable Upload API).

const t = ar.templates;
const status = ar.enums.templateStatus;
const row = (page: Page, key: keyof typeof t.names) => page.getByRole('row').filter({ hasText: t.names[key] });

async function openSettings(page: Page): Promise<void> {
  await page.goto('/admin/settings/communications?tab=templates');
  await expect(page.getByRole('heading', { name: t.title })).toBeVisible();
}

async function submitRow(page: Page, key: keyof typeof t.names): Promise<void> {
  await row(page, key).getByRole('button', { name: t.submit }).click();
  const dialog = page.getByRole('dialog', { name: t.submit });
  await expect(dialog).toContainText(t.names[key]);
  await dialog.getByRole('button', { name: t.submitConfirmYes }).click();
  await expect(page.getByText(t.submitted)).toBeVisible();
}

test.describe('templates — health check and submit', () => {
  let saved: TemplateRow[] = [];
  test.beforeEach(async () => {
    saved = await snapshotTemplates();
    await stubReset(); // the 8 default templates approved, the other 5 absent
    await setTemplateStatus({ key: 'lesson_reminder', status: 'approved' });
  });
  test.afterEach(async () => {
    await restoreTemplates(saved);
    await stubReset();
  });

  test('the notifications number’s «مزامنة مع Meta» shows the stub statuses; PAUSED at Meta shows paused and needs attention', async ({
    asRole,
  }) => {
    const admin = await asRole('admin');
    await openSettings(admin);
    await syncNumber(admin, 'notifications');
    await expect(row(admin, 'lesson_reminder')).toContainText(status.approved);
    await expect(row(admin, 'report_ready')).toContainText(status.not_submitted);
    expect((await templateRow('lesson_reminder')).last_checked_at).not.toBeNull();

    // Meta's meta_name for lesson_reminder is lesson_reminder_v2 (migration 141).
    await stubTemplateStatus('lesson_reminder_v2', 'PAUSED');
    await syncNumber(admin, 'notifications');
    await expect(row(admin, 'lesson_reminder')).toContainText(status.paused);
    await expect(row(admin, 'lesson_reminder').getByRole('button', { name: t.submit })).toHaveCount(0);
    await expect(admin.getByText(t.needsAttention)).toBeVisible();
    expect((await templateRow('lesson_reminder')).status).toBe('paused');
  });

  test('a template missing at Meta is submitted after the confirm: pending, and «Meta» has it', async ({ asRole }) => {
    await setTemplateStatus({ key: 'renewal_due', status: 'approved' }); // the stub does not have it
    const admin = await asRole('admin');
    await openSettings(admin);
    await syncNumber(admin, 'notifications');
    await expect(row(admin, 'renewal_due')).toContainText(status.missing);
    expect((await templateRow('renewal_due')).status).toBe('missing');

    await submitRow(admin, 'renewal_due');
    await expect(row(admin, 'renewal_due')).toContainText(status.pending);
    const db = await templateRow('renewal_due');
    expect(db.status).toBe('pending');
    expect(db.submitted_at).not.toBeNull();
    const meta = (await stubTemplates()).find((m) => m.name === 'renewal_due');
    expect(meta?.status).toBe('PENDING');
  });

  test('report_ready (document header): the sample PDF is uploaded and its handle is on the submission', async ({
    asRole,
  }) => {
    await setTemplateStatus({ key: 'report_ready', status: 'not_submitted' });
    const admin = await asRole('admin');
    await openSettings(admin);
    await submitRow(admin, 'report_ready');
    await expect(row(admin, 'report_ready')).toContainText(status.pending);
    expect((await templateRow('report_ready')).status).toBe('pending');

    // The stub only accepts a header_handle from a finished upload (session + file at offset 0).
    const meta = (await stubTemplates()).find((m) => m.name === 'report_ready');
    expect(meta?.status).toBe('PENDING');
    const header = meta?.components.find((c) => c.type === 'HEADER');
    expect(header?.format).toBe('DOCUMENT');
    expect(header?.example?.header_handle?.[0]).toMatch(/^4::/);
  });
});
