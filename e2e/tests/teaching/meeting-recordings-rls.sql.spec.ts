import { expect, test } from '@playwright/test';
import { as, rolledBack, userId, type Tx } from '../../support/core/rls';
import { USERS } from '../../support/core/users';

// Migration 212: an internal meeting's recordings: the admin reads all, the creator their own
// meeting's, nobody else; a row belongs to exactly one lesson or one meeting.

async function meetingOf(tx: Tx, createdBy: string | null): Promise<string> {
  const [m] = await tx<{ id: string }[]>`insert into public.meetings (title, created_by) values ('rls212', ${createdBy}) returning id`;
  if (!m) throw new Error('no meeting');
  return m.id;
}

async function recordingOf(tx: Tx, meetingId: string): Promise<void> {
  await tx`insert into public.lesson_recordings (meeting_id, file_path) values (${meetingId}, ${`meetings/${meetingId}/rls212.mp4`})`;
}

test.describe('lesson_recordings for meetings (migration 212)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('the creator reads their meeting’s recording, the admin reads all, another meeting stays hidden', async () => {
    await rolledBack(async (tx) => {
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const mine = await meetingOf(tx, teacher);
      const theirs = await meetingOf(tx, admin);
      await recordingOf(tx, mine);
      await recordingOf(tx, theirs);
      const seen = (uid: string) =>
        as(tx, uid, () => tx<{ meeting_id: string }[]>`select meeting_id from public.lesson_recordings where file_path like '%rls212.mp4'`);
      expect((await seen(teacher)).map((r) => r.meeting_id)).toEqual([mine]);
      expect((await seen(admin)).map((r) => r.meeting_id).sort()).toEqual([mine, theirs].sort());
    });
  });

  test('exactly one owner; one running recording per meeting', async () => {
    await rolledBack(async (tx) => {
      const meeting = await meetingOf(tx, null);
      const code = (q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', (e: { code?: string }) => e.code);
      expect(await code(() => tx`insert into public.lesson_recordings (file_path) values ('x.mp4')`)).toBe('23514');
      await recordingOf(tx, meeting);
      expect(await code(() => recordingOf(tx, meeting))).toBe('23505');
    });
  });
});
