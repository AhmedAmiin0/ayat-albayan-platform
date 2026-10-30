import { ar, expect, test } from '../../support/core/fixtures';
import { backdateInbound, bubble, lastOutbound, roleOf } from '../../support/messaging/inbox';
import { resetAbrar, seedFamily, seedLesson, withSql } from '../../support/core/schedule';
import { setMessaging, stubInbound, stubReset, stubSent, stubStatus } from '../../support/wa-stub';

// Closed 24 h window (R-MSG-01, H4) and delivery chips (R-MSG-05): the composer offers only a
// template, picked with the lesson it is about; Meta's delivered / read statuses reach the bubble.

const KEY = 'booking_confirmation_plain';
const status = ar.enums.messageStatus;
const field = ar.inbox.composer;

test.describe('inbox — closed session template and delivery chips (R-MSG-01, R-MSG-05)', () => {
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
  });
  test.afterEach(async () => {
    await setMessaging(false);
  });

  test('closed window: no text box → template + lesson → sent by the admin → delivered → read', async ({ asRole }) => {
    test.setTimeout(120_000);
    const teacherId = await resetAbrar();
    const stamp = String(Date.now()).slice(-4);
    const guardian = `أم رقية ${stamp}`;
    const student = `رقية ${stamp}`;
    const family = await seedFamily(guardian, [student]);
    const startsAt = new Date(Date.now() + 3 * 86_400_000);
    await seedLesson({ teacherId, studentId: family.studentIds[0] ?? '', startsAt, minutes: 30 });
    const [row] = await withSql((sql) => sql<{ phone_e164: string }[]>`
      select phone_e164 from public.guardians where id = ${family.guardianId}`);
    const phone = row?.phone_e164 ?? '';
    const digits = phone.replace(/\D/g, '');
    expect((await stubInbound({ from: digits, name: guardian, text: 'السلام عليكم' })).status).toBe(200);
    await expect.poll(async () => (await withSql((sql) => sql`
      select 1 from public.messages where phone_e164 = ${phone} and direction = 'inbound'`)).length).toBe(1);
    await backdateInbound({ phone, hoursAgo: 25 });

    const admin = await asRole('admin');
    // 25 h old, it sorts behind every newer thread (25 a page): once a full run has made many, it
    // is off page 1. Open it by its phone, the link's own URL, instead of by its row in the list.
    await admin.goto(`/admin/inbox?page=1&phone=${encodeURIComponent(phone)}`);
    const log = admin.getByRole('log', { name: ar.messages.log });
    await expect(log).toBeVisible();
    await expect(admin.getByText(ar.inbox.sessionClosed)).toBeVisible();
    await expect(admin.getByRole('textbox', { name: ar.inbox.composer.messageLabel })).toHaveCount(0);
    await expect(admin.getByRole('button', { name: field.send, exact: true })).toHaveCount(0);

    // The template is picked with the lesson it is about (rule 6): its names and time come from it.
    await admin.getByLabel(field.chooseTemplate).selectOption({ label: ar.templates.names[KEY] });
    await admin.getByLabel(field.pickLesson).selectOption({ index: 1 });
    await expect(admin.getByLabel(field.paramNames.student_names, { exact: true })).toHaveValue(student);
    await expect(admin.getByLabel(field.paramNames.lesson_when, { exact: true })).not.toHaveValue('');
    await admin.getByRole('button', { name: field.sendTemplate, exact: true }).click();
    await expect(log).toContainText(ar.inbox.templateLine.replace('{name}', ar.templates.names[KEY]));

    // «Meta» got the template with both variables; the row is the admin's, keyed per request.
    await expect.poll(async () => (await stubSent()).filter((m) => m.to === digits && m.template === KEY).length).toBe(1);
    const sent = (await stubSent()).find((m) => m.to === digits);
    expect(JSON.stringify(sent?.body)).toContain(student);
    const out = await lastOutbound(phone);
    expect(out.template_key).toBe(KEY);
    expect(out.dedup_key).toMatch(new RegExp(`^admin:\\+?${digits}:`));
    expect(await roleOf(out.created_by)).toBe('admin');
    await expect.poll(async () => (await lastOutbound(phone)).status).toBe('sent');
    const wamid = (await lastOutbound(phone)).wa_message_id ?? '';
    expect(wamid).not.toBe('');

    // Meta reports delivery, then the read: the ticks follow (the open thread polls every 10 s).
    const chip = (label: string) => bubble(log, ar.templates.names[KEY]).getByRole('img', { name: label, exact: true });
    await stubStatus({ id: wamid, status: 'delivered' });
    await expect(chip(status.delivered)).toBeVisible({ timeout: 30_000 });
    await stubStatus({ id: wamid, status: 'read' });
    await expect(chip(status.read)).toBeVisible({ timeout: 30_000 });
    const done = await lastOutbound(phone);
    expect(done.status).toBe('read');
    expect(done.read_at).not.toBeNull();
  });
});
