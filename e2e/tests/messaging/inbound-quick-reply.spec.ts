import { ar, expect, test } from '../../support/core/fixtures';
import {
  auditActions, guardianName, guardianPhone, inboundFor, lessonView, pushesLike, seedSentConfirmation,
} from '../../support/messaging/inbound';
import { resetAbrar, seedFamily, seedLesson } from '../../support/schedule';
import { setMessaging, stubInbound, stubReset } from '../../support/wa-stub';

// Quick replies from a guardian (R-MSG-04, R-SCH-03, docs/12 §3.5): «نعم» / the confirm button
// confirms the lesson through the state machine (confirmed_by null = WhatsApp, audited); a button
// for someone else's lesson is only stored; a reschedule request stays an admin job (own push).

const POLL = { timeout: 30_000, intervals: [500, 1_000, 2_000] };
const DAY = 24 * 60 * 60_000;

interface Scene {
  guardianId: string;
  phone: string;
  lessonId: string;
  waId: string;
}

/** A guardian with a scheduled lesson in `days` days and the booking confirmation already sent. */
async function scene(input: { name: string; days: number; teacherId: string }): Promise<Scene> {
  const { teacherId } = input;
  const family = await seedFamily(input.name, ['سلمى']);
  const studentId = family.studentIds[0] ?? '';
  const lessonId = await seedLesson({ teacherId, studentId, startsAt: new Date(Date.now() + input.days * DAY), minutes: 30 });
  const phone = await guardianPhone(family.guardianId);
  const waId = `wamid.e2e-${Date.now()}-${family.guardianId.slice(0, 8)}`;
  await seedSentConfirmation({ phone, guardianId: family.guardianId, lessonId, waId });
  return { guardianId: family.guardianId, phone, lessonId, waId };
}

test.describe('inbound WhatsApp — quick replies', () => {
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
  });
  test.afterEach(async () => {
    await setMessaging(false);
  });

  test('the confirm button answering the confirmation (context wamid) confirms the lesson, audited', async () => {
    const teacherId = await resetAbrar();
    const s = await scene({ name: 'أم سلمى', days: 3, teacherId });
    expect((await lessonView(s.lessonId)).status).toBe('scheduled');
    await stubInbound({ from: s.phone.slice(1), button: { text: 'تمام، هنحضر', payload: `confirm:${s.lessonId}` }, context: s.waId });

    await expect.poll(async () => (await lessonView(s.lessonId)).status, POLL).toBe('confirmed');
    const lesson = await lessonView(s.lessonId);
    expect(lesson.confirmed_by).toBeNull(); // the guardian by WhatsApp, not an admin
    expect(lesson.confirmed_at).not.toBeNull();
    expect(await auditActions(s.lessonId)).toContain('confirm_by_whatsapp');
    const [row] = await inboundFor(s.phone);
    expect(row).toMatchObject({ lesson_id: s.lessonId, guardian_id: s.guardianId, reply_to_wa_id: s.waId });
    expect(row?.interactive_payload).not.toBeNull();
  });

  test('a typed «نعم» with no button confirms the lesson of the confirmation sent in the last 48 h', async () => {
    const teacherId = await resetAbrar();
    const s = await scene({ name: 'أم جود', days: 3, teacherId });
    await stubInbound({ from: s.phone.slice(1), text: 'نعم' });
    await expect.poll(async () => (await lessonView(s.lessonId)).status, POLL).toBe('confirmed');
    expect((await inboundFor(s.phone))[0]?.lesson_id).toBe(s.lessonId);
    expect(await auditActions(s.lessonId)).toContain('confirm_by_whatsapp');
  });

  test('a reschedule reply links the lesson, changes nothing, and pings the admin with its own push', async () => {
    const teacherId = await resetAbrar();
    const s = await scene({ name: 'أم ريم', days: 3, teacherId });
    await stubInbound({ from: s.phone.slice(1), text: 'غيروا الميعاد لو سمحتم' });
    await expect.poll(async () => (await inboundFor(s.phone)).length, POLL).toBe(1);
    expect((await inboundFor(s.phone))[0]?.lesson_id).toBe(s.lessonId);
    const title = ar.notifications.rescheduleTitle.replace('{name}', await guardianName(s.guardianId));
    await expect.poll(async () => (await pushesLike({ kind: 'new_message', prefix: `${s.phone}:reschedule:` })).length, POLL).toBeGreaterThan(0);
    const pushes = await pushesLike({ kind: 'new_message', prefix: `${s.phone}:reschedule:` });
    expect(pushes.every((p) => p.title === title)).toBe(true);
    expect((await lessonView(s.lessonId)).status).toBe('scheduled'); // moving it is the admin's job
    expect(await auditActions(s.lessonId)).not.toContain('confirm_by_whatsapp');
  });

  test("a confirm button for another guardian's lesson is only stored: nothing is confirmed", async () => {
    const teacherId = await resetAbrar();
    const mine = await scene({ name: 'أم نور', days: 3, teacherId });
    const theirs = await scene({ name: 'أم هدى', days: 4, teacherId });
    await stubInbound({ from: mine.phone.slice(1), button: { text: 'تمام، هنحضر', payload: `confirm:${theirs.lessonId}` } });
    await expect.poll(async () => (await inboundFor(mine.phone)).length, POLL).toBe(1);
    expect((await inboundFor(mine.phone))[0]?.lesson_id).toBeNull();
    expect((await lessonView(theirs.lessonId)).status).toBe('scheduled');
    expect((await lessonView(mine.lessonId)).status).toBe('scheduled');
  });
});
