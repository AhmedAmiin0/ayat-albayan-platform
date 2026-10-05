import { ar, expect, test } from '../support/fixtures';
import {
  addDays,
  lessonsOf,
  queuedFor,
  resetAbrar,
  riyadh,
  seedFamily,
  seedLesson,
  setAvailability,
  withSql,
} from '../support/schedule';

// Teacher «اقترح موعدًا آخر» → admin «وافق على الموعد» (R-SCH-08, lesson-proposals.controller.ts):
// «أبرار» moves her own lesson 90 minutes later on her own clock (Cairo), the admin approves it
// from «طلبات تغيير الموعد», and the lesson moves like any reschedule (R-SCH-07): the old row is
// `rescheduled`, a new row starts at the proposed time, the guardian's confirmation is queued.

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;
const MINUTE = 60_000;
const NOTE = 'عندي ظرف في الميعاد ده';

/** Today in Riyadh (UTC+3 all year), YYYY-MM-DD. */
function riyadhToday(now = new Date()): string {
  return new Date(now.getTime() + 3 * 60 * MINUTE).toISOString().slice(0, 10);
}

/** «HH:MM» of an instant on the e2e teacher's clock (Africa/Cairo, DST-aware). */
function cairoClock(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);
}

type ProposalRow = { status: string; proposed_starts_at: Date; note: string | null };

async function proposalOf(lessonId: string): Promise<ProposalRow | undefined> {
  return withSql(async (sql) => {
    const [row] = await sql<ProposalRow[]>`
      select status, proposed_starts_at, note from public.lesson_proposals where lesson_id = ${lessonId}`;
    return row;
  });
}

test.describe('lesson proposal — teacher proposes, admin approves (R-SCH-08)', () => {
  test('«اقترح موعدًا آخر» 90 minutes later → «وافق على الموعد» → the lesson moved', async ({ asRole }) => {
    // «أبرار» works 10:00–22:00 Riyadh every day (approving runs the usual conflict check).
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, EVERY_DAY.map((d) => [d, '10:00', '22:00']));
    const family = await seedFamily('أم ريم', ['ريم']);
    const [studentId = ''] = family.studentIds;
    const startsAt = riyadh(addDays(riyadhToday(), 2), '14:00');
    const lessonId = await seedLesson({ teacherId, studentId, startsAt, minutes: 45 });
    const movedTo = new Date(startsAt.getTime() + 90 * MINUTE);

    // Teacher: the week tab → the lesson card → the form, on her own clock (same day, +90 min).
    const teacher = await asRole('teacher');
    await teacher.goto('/teacher');
    await teacher.getByRole('tab', { name: ar.teacherDash.week }).click();
    const card = teacher.getByRole('article', { name: /ريم/ });
    await card.getByRole('button', { name: ar.teacherDash.proposeReschedule }).click();
    // The form sits in the card from 640px and in a full-screen dialog on a phone: find it by name.
    const form = teacher.getByRole('form', { name: ar.teacherDash.propose.title });
    const time = form.getByLabel(ar.teacherDash.propose.time);
    await expect(time).toHaveValue(cairoClock(startsAt));
    await time.selectOption(cairoClock(movedTo));
    await form.getByLabel(ar.teacherDash.propose.note).fill(NOTE);
    await form.getByRole('button', { name: ar.teacherDash.propose.submit }).click();
    await expect(teacher.getByRole('status').filter({ hasText: ar.teacherDash.propose.sent })).toBeVisible();
    const waiting = ar.teacherDash.propose.pending.split('{when}')[1] ?? '';
    await expect(card.getByText(waiting)).toBeVisible();
    const proposed = await proposalOf(lessonId);
    expect(proposed).toMatchObject({ status: 'pending', note: NOTE });
    expect(proposed?.proposed_starts_at.toISOString()).toBe(movedTo.toISOString());

    // Admin: «طلبات تغيير الموعد» above the week → the lesson drawer → «وافق على الموعد».
    const admin = await asRole('admin');
    await admin.goto('/admin/schedule');
    const panel = admin.getByRole('region', { name: new RegExp(ar.lessons.proposal.title) });
    await panel.getByRole('button', { name: /ريم/ }).click();
    const drawer = admin.getByRole('dialog', { name: 'ريم' });
    await expect(drawer.getByText(NOTE)).toBeVisible();
    await drawer.getByRole('button', { name: ar.lessons.proposal.approve }).click();
    await expect(admin.getByRole('status')).toHaveText(ar.lessons.proposal.approved);

    // Moved: the old row is closed, the new one starts at the proposed instant.
    const rows = await lessonsOf(studentId);
    expect(rows.map((l) => [l.status, l.starts_at.toISOString()])).toEqual([
      ['rescheduled', startsAt.toISOString()],
      ['scheduled', movedTo.toISOString()],
    ]);
    expect(await proposalOf(lessonId)).toMatchObject({ status: 'approved' });
    await expect
      .poll(() => queuedFor(family.guardianId))
      .toContainEqual(expect.objectContaining({ template_key: 'booking_confirmation', status: 'queued' }));

    // The teacher's week shows the lesson at the new time, with nothing left waiting.
    await teacher.reload();
    await teacher.getByRole('tab', { name: ar.teacherDash.week }).click();
    const moved = teacher.getByRole('article', { name: new RegExp(`^${cairoClock(movedTo)} ريم`) });
    await expect(moved).toBeVisible();
    await expect(teacher.getByText(waiting)).toHaveCount(0);
  });
});
