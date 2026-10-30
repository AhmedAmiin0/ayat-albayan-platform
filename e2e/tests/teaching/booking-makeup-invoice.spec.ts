import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { fillStable } from '../../support/core/fill';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, seedFamily, seedLesson, setAvailability, withSql } from '../../support/schedule';
import { STUB_URL, stubInbound, stubReset } from '../../support/wa-stub';
import { sidePanel } from '../../support/messaging/thread-panel';
// Booking types and the invoice (R-SCH-10, R-PAY-03, R-MSG-06): a trial needs none; a package and a makeup do
// (uploaded, or saved from the family's chat); only the admin sees it. «Meta» = wa-stub.
const API = 'http://localhost:3100';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const digits = (plus = 0) => `9665${String(Date.now() + plus).slice(-8)}`;
const next = (p: Page) => p.getByRole('button', { name: ar.booking.next }).click();
const book = (p: Page) => p.getByRole('button', { name: ar.booking.submit }).click();
const authToken = (p: Page) => p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.endsWith('-auth-token')) ?? '') ?? '{}').access_token as string);
/** «أبرار» free on Sundays 16:00–18:00 only, a clean «Meta» log: the first slot is known. */
async function reset(): Promise<string> {
  const id = await resetAbrar();
  await Promise.all([stubReset(), setAvailability(id, [[0, '16:00', '18:00']])]);
  return id;
}
/** A new lead writes, and the admin opens the thread. */
async function openLead(admin: Page, o: { name: string; from: string }): Promise<void> {
  expect((await stubInbound({ from: o.from, name: o.name, text: 'السلام عليكم' })).status).toBe(200);
  await admin.goto('/admin/inbox');
  await admin.getByRole('link', { name: ar.inbox.openThread.replace('{name}', o.name) }).click({ timeout: 30_000 });
}
/** A guardian sends a photo per caption (stubInbound has no media option: the same control endpoint). */
async function sendPhotos(from: string, name: string, captions: string[]): Promise<void> {
  for (const caption of captions) {
    const media = { kind: 'image', mime: 'image/png', caption, base64: PNG.toString('base64') };
    const body = JSON.stringify({ from, name, media });
    await fetch(`${STUB_URL}/__stub/inbound`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  }
}
/** On the invoice step: a device upload (to the signed URL), until its preview shows. */
async function upload(admin: Page): Promise<void> {
  await admin.getByLabel(ar.booking.invoice.upload).setInputFiles({ name: 'inv.png', mimeType: 'image/png', buffer: PNG });
  await expect(admin.getByRole('button', { name: ar.booking.invoice.remove })).toBeVisible();
}
/** On the slot step: next week's Sunday 16:00, then on. */
async function pickSunday(admin: Page): Promise<void> {
  const step = admin.getByRole('region', { name: ar.booking.steps.slot });
  await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
  await step.getByRole('region', { name: new RegExp(`^${ar.enums.weekday['0']} `) }).getByRole('button', { name: /16:00/ }).click();
  await next(admin);
}
/** A lead's wizard: the new student → teacher «أبرار» → package → the Sunday slot → on. */
async function toSlot(admin: Page, student: string): Promise<void> {
  await fillStable(admin.getByLabel(ar.leads.studentName, { exact: true }), student);
  await next(admin);
  await admin.getByRole('radio', { name: /أبرار/ }).check();
  await next(admin);
  await next(admin);
  await pickSunday(admin);
}

const invoiceOf = (student: string) => withSql((sql) => sql<{ id: string; source: string; kind: string }[]>`
  select i.id, i.source, i.kind from public.invoices i
  join public.schedule_rule_students rs on rs.rule_id = i.rule_id join public.students s on s.id = rs.student_id
  where s.name = ${student}`);

test.describe('booking types and the invoice (R-SCH-10, R-PAY-03, R-MSG-06)', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeEach(reset);

  test('a trial has no invoice step; a package needs one: blocked until a file is uploaded', async ({ asRole }) => {
    const admin = await asRole('admin');
    const trial = `ياسمين${digits().slice(-3)}`;
    await openLead(admin, { name: `أم ${trial}`, from: digits() });
    await (await sidePanel(admin, 'lead')).getByRole('link', { name: ar.booking.trialTitle }).click();
    await toSlot(admin, trial);
    await expect(admin.getByText(ar.booking.invoice.label, { exact: true })).toHaveCount(0);
    await book(admin);
    await expect(admin.getByRole('heading', { name: ar.booking.booked })).toBeVisible();
    expect(await invoiceOf(trial)).toEqual([]);

    await reset(); // the trial took the first slot
    const student = `مريم${digits().slice(-3)}`;
    await openLead(admin, { name: `أم ${student}`, from: digits(1) });
    await (await sidePanel(admin, 'lead')).getByRole('link', { name: ar.inbox.subscription.subscribe, exact: true }).click();
    await toSlot(admin, student);
    await expect(admin.getByText(ar.booking.invoice.hint)).toBeVisible();
    await expect(admin.getByRole('button', { name: ar.booking.next })).toBeDisabled();
    await upload(admin);
    await next(admin);
    await book(admin);
    await expect(admin.getByRole('button', { name: ar.booking.invoice.view })).toBeVisible();
    expect(await invoiceOf(student)).toMatchObject([{ source: 'upload', kind: 'package' }]);
  });

  test('a makeup of a missed lesson, its invoice saved from the chat: thumbnail, an old photo disabled, the saved bytes are the photo', async ({ asRole }) => {
    const teacherId = await reset();
    const name = `سلمى${digits().slice(-3)}`;
    const family = await seedFamily(`أم ${name}`, [name]);
    const studentId = family.studentIds[0] ?? '';
    const [g] = await withSql((sql) => sql<{ phone_e164: string }[]>`select phone_e164 from public.guardians where id = ${family.guardianId}`);
    const phone = g?.phone_e164 ?? '';
    await sendPhotos(phone.slice(1), `أم ${name}`, ['التحويل', 'قديمة']); // the webhook stores async: age the second once it is there
    await expect.poll(async () => (await withSql((sql) => sql`update public.messages set created_at = now() - interval '29 days 12 hours'
      where phone_e164 = ${phone} and body = 'قديمة' returning id`)).length).toBe(1);
    const day = addDays(nextWeekSaturday(), -8);
    const missed = await seedLesson({ teacherId, studentId, startsAt: riyadh(day, '17:00'), minutes: 45 });
    await withSql((sql) => sql`with r as (insert into public.schedule_rules (teacher_id, duration_min, start_time_local, tz, byday, starts_on, package)
        values (${teacherId}, '45', '17:00', 'Asia/Riyadh', '{5}', ${day}, '8') returning id),
      rs as (insert into public.schedule_rule_students (rule_id, student_id) select id, ${studentId}::uuid from r)
      update public.lessons set status = 'no_show', rule_id = (select id from r) where id = ${missed}`);
    const admin = await asRole('admin');
    await admin.goto(`/admin/schedule?week=${addDays(nextWeekSaturday(), -14)}&teacher=${teacherId}`);
    await admin.getByRole('button', { name: new RegExp(name) }).click();
    await admin.getByRole('dialog', { name }).getByRole('link', { name: ar.booking.makeup.action }).click();
    await expect(admin.getByRole('radio', { name: ar.booking.kind.makeup })).toBeChecked();
    await next(admin);
    await expect(admin.getByRole('radio', { name: new RegExp(ar.enums.lessonStatus.no_show) })).toBeChecked();
    await next(admin);
    await expect(admin.getByRole('radio', { name: /أبرار/ })).toBeChecked();
    await next(admin);
    await pickSunday(admin);
    // The invoice is required for a makeup too: «من المحادثة» lists the two photos, the old one is disabled.
    await expect(admin.getByRole('button', { name: ar.booking.next })).toBeDisabled();
    await admin.getByRole('button', { name: ar.booking.invoice.fromChat }).click();
    const dialog = admin.getByRole('dialog', { name: ar.booking.invoice.chatTitle });
    await expect(dialog.getByText(ar.booking.invoice.expired)).toBeVisible();
    const photo = dialog.getByRole('button').filter({ hasText: 'التحويل' });
    await expect.poll(() => photo.getByRole('img').evaluate((i) => (i as unknown as { naturalWidth: number }).naturalWidth)).toBeGreaterThan(0);
    await photo.click();
    await next(admin);
    await book(admin);
    await expect(admin.getByRole('heading', { name: ar.booking.makeup.booked })).toBeVisible();
    const [invoice] = await invoiceOf(name);
    expect(invoice).toMatchObject({ source: 'whatsapp', kind: 'makeup' });
    const res = await admin.request.get(`${API}/invoices/${invoice?.id}/download`, { headers: { authorization: `Bearer ${await authToken(admin)}` } });
    const { url } = (await res.json()) as { url: string };
    expect(Buffer.from(await (await fetch(url)).arrayBuffer()).equals(PNG)).toBe(true);
    await expect(admin.getByRole('button', { name: ar.inbox.subscription.make })).toHaveCount(0);
    expect(await withSql((sql) => sql`select id from public.lessons where makeup_of_id = ${missed}`)).toHaveLength(1);
    await admin.goto(`/admin/book?kind=makeup&studentId=${studentId}&missedLessonId=${missed}`);
    await next(admin);
    await expect(admin.getByText(ar.booking.makeup.noneForLesson)).toBeVisible();
  });

  test('a teacher never reaches invoices or the chat’s files', async ({ asRole }) => {
    const teacher = await asRole('teacher');
    await teacher.goto('/teacher');
    const headers = { authorization: `Bearer ${await authToken(teacher)}` };
    expect((await teacher.request.get(`${API}/invoices?ruleId=0b5e7d1a-2c3d-4e5f-9a8b-7c6d5e4f3a2b`, { headers })).status()).toBe(403);
    expect((await teacher.request.get(`${API}/threads/%2B966500000000/media`, { headers })).status()).toBe(403);
  });
});
