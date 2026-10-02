import type { Page } from '@playwright/test';
import { ar, expect, test } from '../support/fixtures';
import { resetAbrar, seedFamily, setAvailability, withSql } from '../support/schedule';
import { stubInbound, stubReset } from '../support/wa-stub';

// Subscribe from the chat (R-SUB-01, R-LEAD-02, R-LEAD-06): a new lead writes on WhatsApp → the
// thread says «مش مشترك» → «اشترك» books a regular package (new guardian + student) → «اعمل
// الاشتراك» → back in the thread it says «مشترك». A guardian's thread offers «اشتراك جديد» per
// child. «Meta» is tools/wa-stub; messaging stays off (journeys 2–4 assert `queued`).

const SUNDAY = ar.enums.weekday['0'];
const badge = ar.inbox.subscription.badge;
const openThread = (name: string) => ar.inbox.openThread.replace('{name}', name);

/** A fresh Saudi mobile per call (desktop and mobile share one DB), wa_id digits without «+». */
const freshDigits = () => `9665${String(Date.now()).slice(-8)}`;

/** The open conversation: its section is named by the heading (the contact's name). Badges are
 * read from its header: «مشترك» is also the child's package chip once a package is active. */
const pane = (page: Page, name: string) => page.getByRole('region', { name });

/** The create dialog preset with `student`: keep the calculator defaults and save. */
async function saveSubscription(page: Page, student: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: ar.subscriptions.new });
  await expect(dialog.getByText(student, { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: ar.common.save }).click();
  await expect(dialog).toBeHidden();
}

test.describe('subscribe from the chat (R-SUB-01)', () => {
  test.beforeEach(async () => {
    await stubReset();
  });

  test('a new lead: «اشترك» → regular package booked → subscription → «مشترك»', async ({ asRole }) => {
    test.setTimeout(150_000);
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, [[0, '16:00', '18:00']]);
    const digits = freshDigits();
    const guardian = `أم مريم ${digits.slice(-4)}`;
    const student = 'مريم';
    expect((await stubInbound({ from: digits, name: guardian, text: 'عايزة أشترك لبنتي' })).status).toBe(200);

    const admin = await asRole('admin');
    await admin.goto('/admin/inbox');
    await admin.getByRole('link', { name: openThread(guardian) }).click({ timeout: 30_000 });
    const thread = pane(admin, guardian);
    await expect(thread.locator('header').getByText(badge.none, { exact: true })).toBeVisible();

    // «اشترك» opens the wizard with the lead and a regular package (not the trial).
    await thread.getByRole('link', { name: ar.inbox.subscription.subscribe, exact: true }).click();
    await expect(admin).toHaveURL(/\/admin\/book\?.*leadId=.*pkg=/);
    await admin.getByLabel(ar.students.name, { exact: true }).fill(student);
    await admin.getByRole('button', { name: ar.booking.next }).click();
    await admin.getByRole('radio', { name: /أبرار/ }).check();
    await admin.getByRole('button', { name: ar.booking.next }).click();
    await expect(admin.getByRole('radio', { name: new RegExp(ar.enums.packageSize['8']) })).toBeChecked();
    await admin.getByRole('button', { name: ar.booking.next }).click();
    const step = admin.getByRole('region', { name: ar.booking.steps.slot });
    await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
    await step.getByRole('region', { name: new RegExp(`^${SUNDAY} `) }).getByRole('button', { name: /16:00/ }).click();
    await admin.getByRole('button', { name: ar.booking.next }).click();
    await admin.getByLabel(ar.booking.meetingLink).fill('https://meet.jit.si/ayat-e2e-subscribe');
    await admin.getByRole('button', { name: ar.booking.submit }).click();
    await expect(admin.getByRole('heading', { name: ar.booking.booked })).toBeVisible();
    // A paid package converts the lead straight away, no trial needed (leadTarget).
    const lead = await withSql((sql) => sql<{ status: string }[]>`select status from public.leads where phone_e164 = ${`+${digits}`}`);
    expect(lead[0]?.status).toBe('converted');

    // «اعمل الاشتراك» right after the booking, for the new student.
    await admin.getByRole('button', { name: ar.inbox.subscription.make }).click();
    await saveSubscription(admin, student);
    await expect(admin.getByText(ar.subscriptions.saved)).toBeVisible();

    // Back in the chat: the family is subscribed, and the child's package is beside the chat.
    await admin.getByRole('link', { name: ar.inbox.subscription.backToChat }).click();
    await expect(thread.locator('header').getByText(badge.subscribed, { exact: true })).toBeVisible();
    const family = admin.getByRole('complementary', { name: ar.inbox.subscription.title });
    await expect(family.getByText(student, { exact: true })).toBeVisible();
    await expect(family.getByRole('button', { name: new RegExp(ar.subscriptions.new) })).toBeVisible();
  });

  test('a guardian’s thread: «اشتراك جديد» for the child → «مشترك» in the chat and the list', async ({ asRole }) => {
    test.setTimeout(90_000);
    const guardian = `أم يوسف ${String(Date.now()).slice(-4)}`;
    const student = 'يوسف';
    const family = await seedFamily(guardian, [student]);
    const phone = await guardianPhone(family.guardianId);
    expect((await stubInbound({ from: phone.slice(1), name: guardian, text: 'السلام عليكم' })).status).toBe(200);

    const admin = await asRole('admin');
    await admin.goto('/admin/inbox');
    await admin.getByRole('link', { name: openThread(guardian) }).click({ timeout: 30_000 });
    const thread = pane(admin, guardian);
    await expect(thread.locator('header').getByText(badge.none, { exact: true })).toBeVisible();
    await thread.getByRole('button', { name: `${ar.subscriptions.new} — ${student}` }).click();
    await saveSubscription(admin, student);
    await expect(thread.locator('header').getByText(badge.subscribed, { exact: true })).toBeVisible();

    await admin.goto('/admin/inbox');
    await expect(admin.getByRole('link', { name: openThread(guardian) }).getByText(badge.subscribed)).toBeVisible();
  });

  test('after a trial: «اشتراك جديد» from the guardian’s chat converts the family’s lead (verifier)', async ({ asRole }) => {
    test.setTimeout(90_000);
    const guardian = `أم هند ${String(Date.now()).slice(-4)}`;
    const family = await seedFamily(guardian, ['هند']);
    const phone = await guardianPhone(family.guardianId);
    expect((await stubInbound({ from: phone.slice(1), name: guardian, text: 'الحلقة التجريبية كانت حلوة' })).status).toBe(200);
    // The trial was booked from this lead: the most common funnel.
    await withSql((sql) => sql`insert into public.leads (phone_e164, status) values (${phone}, 'trial_booked')
      on conflict (phone_e164) do update set status = 'trial_booked'`);

    const admin = await asRole('admin');
    await admin.goto('/admin/inbox');
    await admin.getByRole('link', { name: openThread(guardian) }).click({ timeout: 30_000 });
    await pane(admin, guardian).getByRole('button', { name: `${ar.subscriptions.new} — هند` }).click();
    await saveSubscription(admin, 'هند');
    await expect(pane(admin, guardian).locator('header').getByText(badge.subscribed, { exact: true })).toBeVisible();
    const lead = await withSql((sql) => sql<{ status: string }[]>`select status from public.leads where phone_e164 = ${phone}`);
    expect(lead[0]?.status).toBe('converted');
  });
});

/** The seeded guardian's E.164 number (seedFamily makes a fresh one per call). */
async function guardianPhone(id: string): Promise<string> {
  const [row] = await withSql((sql) => sql<{ phone_e164: string }[]>`select phone_e164 from public.guardians where id = ${id}`);
  if (!row) throw new Error('guardian missing');
  return row.phone_e164;
}
