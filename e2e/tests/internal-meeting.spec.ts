import { ar, expect, test } from '../support/fixtures';
import { API } from '../support/messages';
import { withSql } from '../support/schedule';
import { AR_LOCALE } from '../support/locale';

// «اجتماع داخلي» (owner, 2026-10-05): a standalone room with no lesson, no students, no teacher and
// no WhatsApp; just a link /m/<token>. LiveKit does not run in e2e: every join answers 503
// classroom_not_configured, while creating the meeting and its public page never need it.

const L = ar.meetings.internal;
const tag = () => String(Date.now()).slice(-5);

test.describe('internal meeting', () => {
  test('the admin creates one, the guest page shows it, and ending it closes the link', async ({ asRole, browser }) => {
    const title = `تنسيق ${tag()}`;
    const admin = await asRole('admin');
    await admin.goto('/admin/classrooms');
    await admin.getByText(ar.meetings.new).click();
    await admin.getByRole('button', { name: L.item }).click();
    const dialog = admin.getByRole('dialog', { name: L.dialogTitle });
    await dialog.getByLabel(L.title).fill(title);
    await dialog.getByRole('button', { name: L.create }).click();
    const url = await dialog.getByLabel(L.link).inputValue();
    expect(url).toMatch(/\/m\/[A-Za-z0-9_-]{43}$/);
    await expect(dialog.getByRole('button', { name: L.enter })).toBeVisible();
    const token = url.split('/').at(-1) ?? '';

    // Only the sha256 of the token is stored.
    const hashed = await withSql(async (sql) => {
      const [m] = await sql<{ hashed: boolean }[]>`
        select link_token_hash ~ '^[0-9a-f]{64}$' and link_token_hash <> ${token} as hashed
        from public.meetings where title = ${title}`;
      return m?.hashed;
    });
    expect(hashed).toBe(true);

    const guest = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await guest.goto(new URL(url).pathname);
    await expect(guest.getByText(title)).toBeVisible();
    await guest.getByLabel(new RegExp(ar.classroom.guest.name)).fill('ضيف');
    await guest.getByRole('button', { name: ar.classroom.guest.join }).click();
    await expect(guest.getByText(ar.classroom.error.classroom_not_configured)).toBeVisible();
    const join = await guest.request.post(`${API}/public/meetings/${token}/join`, { data: { name: 'ضيف' } });
    expect(join.status()).toBe(503);
    expect((await join.json()).code).toBe('classroom_not_configured');

    await admin.keyboard.press('Escape');
    const item = admin.getByRole('listitem').filter({ hasText: title });
    await item.getByRole('button', { name: L.end }).click();
    await expect(item.getByText(L.ended)).toBeVisible();

    await guest.reload();
    await expect(guest.getByText(L.guest.ended)).toBeVisible();
    await expect(guest.getByRole('button', { name: ar.classroom.guest.join })).toHaveCount(0);
    const gone = await guest.request.get(`${API}/public/meetings/${token}`);
    expect(await gone.json()).toEqual({ title, state: 'ended', starts_at: null, opens_at: null });
  });

  test('a teacher has «اجتماع داخلي» on the home page', async ({ asRole }) => {
    const teacher = await asRole('teacher');
    await teacher.goto('/teacher');
    await teacher.getByRole('button', { name: L.item }).click();
    await expect(teacher.getByRole('dialog', { name: L.dialogTitle })).toBeVisible();
  });
});
