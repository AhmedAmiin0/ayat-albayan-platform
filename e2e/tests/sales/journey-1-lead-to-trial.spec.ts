import { ar, expect, test } from '../../support/fixtures';
import { fillStable } from '../../support/fill';
import { addDays, lessonsOf, nextWeekSaturday, resetAbrar, riyadh, setAvailability, withSql } from '../../support/schedule';
import { setMessaging, stubInbound, stubReset, stubSent, type StubSent } from '../../support/wa-stub';
import { sidePanel } from '../../support/messaging/thread-panel';

// Journey 1 (docs/03 §5): a lead writes on WhatsApp → appears in the inbox → the admin replies →
// books a trial through the wizard → the confirmation goes out → the lesson is on the teacher's
// week. R-LEAD-01/02/06, R-MSG-01/04/05, R-SCH-06. «Meta» is tools/wa-stub (:4110), never Graph.

const SUNDAY = ar.enums.weekday['0'];
const ROOM = 'ayat-e2e-trial';
/** The sender ticks every 30 s; a kick after the enqueue is B1's choice, so wait past one tick. */
const SENDER_WAIT = { timeout: 75_000, intervals: [1_000, 2_000, 5_000] };

const sentTo = async (digits: string): Promise<StubSent[]> =>
  (await stubSent()).filter((m) => m.to.replace(/\D/g, '') === digits);

test.describe('journey 1 — WhatsApp lead to trial (R-LEAD-02, R-MSG-01, R-SCH-06)', () => {
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true); // the env gate is open in playwright.config; this is the admin switch
  });
  test.afterEach(async () => {
    await setMessaging(false); // journeys 2–4 assert `queued`
  });

  test('inbound → inbox → session reply → trial booked → confirmation template → teacher week', async ({
    asRole,
  }) => {
    test.setTimeout(180_000);
    // «أبرار» is free on Sundays 16:00–18:00 Riyadh only, so the wizard's first slot is known.
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, [[0, '16:00', '18:00']]);
    // desktop and mobile share one DB: a fresh Saudi mobile and guardian name per run (wa_id =
    // digits, no +), so the other project's thread never matches the same link.
    const digits = `9665${String(Date.now()).slice(-8)}`;
    const guardian = `أم ياسمين ${digits.slice(-4)}`;
    const student = 'ياسمين';
    const hello = 'السلام عليكم، عايزة أحجز حلقة تجريبية لبنتي';
    const inbound = await stubInbound({ from: digits, name: guardian, text: hello });
    expect(inbound.status).toBe(200); // the API accepted the signed webhook

    // The lead is in the inbox (the list refreshes on its own: the webhook stores async).
    const admin = await asRole('admin');
    await admin.goto('/admin/inbox');
    const open = admin.getByRole('link', { name: ar.inbox.openThread.replace('{name}', guardian) });
    await expect(open).toBeVisible({ timeout: 30_000 });
    await open.click();
    const log = admin.getByRole('log', { name: ar.messages.log });
    await expect(log).toContainText(hello);

    // Inside the 24 h window: a plain session reply, recorded by «Meta».
    const reply = 'وعليكم السلام، أهلًا بحضرتك. نحجز لها حلقة تجريبية؟';
    await admin.getByRole('textbox', { name: ar.inbox.composer.messageLabel }).fill(reply);
    await admin.getByRole('button', { name: ar.inbox.composer.send, exact: true }).click();
    await expect(log).toContainText(reply);
    await expect
      .poll(async () => (await sentTo(digits)).filter((m) => m.type === 'text').length, SENDER_WAIT)
      .toBe(1);

    // «حجز حلقة تجريبية» opens the Phase 2 wizard with the lead (phone + name prefilled).
    await (await sidePanel(admin, 'lead')).getByRole('link', { name: ar.booking.trialTitle }).click();
    await expect(admin).toHaveURL(/\/admin\/book\?.*leadId=/);
    await fillStable(admin.getByLabel(ar.leads.studentName, { exact: true }), student);
    await expect(admin.getByLabel(ar.guardians.name, { exact: true })).toHaveValue(guardian);
    await expect(admin.getByRole('radio', { name: ar.booking.kind.trial })).toBeChecked();
    await admin.getByRole('button', { name: ar.booking.next }).click();
    await admin.getByRole('radio', { name: /أبرار/ }).check();
    await admin.getByRole('button', { name: ar.booking.next }).click();
    // A trial has no package to pick (the type is «نوع الحجز» on step 1): only the duration shows.
    await expect(admin.getByRole('radio', { name: new RegExp(ar.enums.packageSize['8']) })).toHaveCount(0);
    await admin.getByRole('button', { name: ar.booking.next }).click();

    const step = admin.getByRole('region', { name: ar.booking.steps.slot });
    await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
    const sunday = step.getByRole('region', { name: new RegExp(`^${SUNDAY} `) });
    await sunday.getByRole('button', { name: /16:00/ }).click();
    await admin.getByRole('button', { name: ar.booking.next }).click();
    await admin.getByLabel(ar.booking.meetingLink).fill(`https://meet.jit.si/${ROOM}`);
    await admin.getByRole('button', { name: ar.booking.submit }).click();
    await expect(admin.getByRole('heading', { name: ar.booking.booked })).toBeVisible();

    // The confirmation reaches «Meta» as the Jitsi template, with the room as the URL button.
    await expect
      .poll(async () => (await sentTo(digits)).filter((m) => m.type === 'template').map((m) => m.template), SENDER_WAIT)
      .toEqual(['booking_confirmation']);
    const [confirmation] = (await sentTo(digits)).filter((m) => m.type === 'template');
    expect(JSON.stringify(confirmation?.body)).toContain(ROOM);
    expect(JSON.stringify(confirmation?.body)).toContain(student);

    // One trial lesson next Sunday 16:00 Riyadh, on «أبرار»'s week in the schedule.
    const week = nextWeekSaturday();
    const [studentId] = await withSql((sql) => sql<{ id: string }[]>`
      select s.id from public.students s join public.guardians g on g.id = s.guardian_id
      where g.phone_e164 = ${`+${digits}`} and s.name = ${student}`).then((rows) => rows.map((r) => r.id));
    expect((await lessonsOf(studentId ?? '')).map((l) => l.starts_at.toISOString())).toEqual([
      riyadh(addDays(week, 1), '16:00').toISOString(),
    ]);
    await admin.goto(`/admin/schedule?week=${week}&teacher=${teacherId}`);
    const grid = admin.getByRole('table', { name: ar.schedule.grid }).or(admin.getByRole('group', { name: ar.schedule.grid })); // table, or the day list on a phone
    await expect(grid.getByRole('button', { name: new RegExp(`16:00.*${student}`) })).toBeVisible();
  });
});
