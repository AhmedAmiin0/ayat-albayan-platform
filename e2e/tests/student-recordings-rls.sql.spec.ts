import { expect, test } from '@playwright/test';
import { as, family, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// Migration 240: no guardian policy on lesson_recordings (a group lesson's file would expose every
// student's session, its path and egress id). A guardian reads nothing, visible or not; the admin
// still reads everything; hidden is the default; the status 'deleted' needs deleted_at.
// Not run in the cloud session that wrote it: the owner runs it after `supabase db reset`.

async function lessonOf(tx: Tx, input: { teacherId: string; studentId: string }): Promise<string> {
  const [l] = await tx<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at)
    values (${input.teacherId}, now() - interval '2 days', now() - interval '2 days' + interval '30 minutes') returning id`;
  if (!l) throw new Error('lesson not written');
  await tx`insert into public.lesson_students (lesson_id, student_id) values (${l.id}, ${input.studentId})`;
  return l.id;
}

async function recording(tx: Tx, over: { lessonId: string; tag: string; visible?: boolean; status?: string }): Promise<void> {
  const { lessonId, tag } = over;
  const status = over.status ?? 'done';
  await tx`insert into public.lesson_recordings (lesson_id, file_path, status, ended_at, visible_to_student, deleted_at)
    values (${lessonId}, ${`lessons/${lessonId}/rls240-${tag}.mp4`}, ${status}, now(), ${over.visible ?? false},
      ${status === 'deleted' ? new Date() : null})`;
}

test.describe('lesson_recordings for guardians (migration 240)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a guardian cannot read any recording, not even a visible one of their own child', async () => {
    await rolledBack(async (tx) => {
      const login = await userId(tx, USERS.teacher.email);
      const admin = await userId(tx, USERS.admin.email);
      const [t] = await tx<{ id: string }[]>`select id from public.teachers where profile_id = ${login}`;
      if (!t) throw new Error('teacher row missing (global setup)');
      const mine = await family(tx, { phone: '+966500000240', teacherId: t.id });
      await tx`update public.guardians set profile_id = ${login} where phone_e164 = '+966500000240'`;
      const myLesson = await lessonOf(tx, { teacherId: t.id, studentId: mine });
      await recording(tx, { lessonId: myLesson, tag: 'shown', visible: true });
      await recording(tx, { lessonId: myLesson, tag: 'hidden' });
      const seen = (uid: string) =>
        as(tx, uid, () => tx<{ file_path: string }[]>`select file_path from public.lesson_recordings where file_path like '%rls240-%'`);
      expect(await seen(login)).toHaveLength(0);
      expect(await seen(admin)).toHaveLength(2);
    });
  });

  test('hidden by default; a deleted row needs deleted_at', async () => {
    await rolledBack(async (tx) => {
      const login = await userId(tx, USERS.teacher.email);
      const [t] = await tx<{ id: string }[]>`select id from public.teachers where profile_id = ${login}`;
      if (!t) throw new Error('teacher row missing (global setup)');
      const kid = await family(tx, { phone: '+966500000242', teacherId: t.id });
      const lessonId = await lessonOf(tx, { teacherId: t.id, studentId: kid });
      await tx`insert into public.lesson_recordings (lesson_id, file_path, status, ended_at) values (${lessonId}, 'x.mp4', 'done', now())`;
      const [row] = await tx<{ visible_to_student: boolean }[]>`select visible_to_student from public.lesson_recordings where lesson_id = ${lessonId}`;
      expect(row?.visible_to_student).toBe(false);
      const code = (q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', (e: { code?: string }) => e.code);
      expect(await code(() => tx`insert into public.lesson_recordings (lesson_id, file_path, status, ended_at) values (${lessonId}, 'y.mp4', 'deleted', now())`)).toBe('23514');
    });
  });

  // Migration 260: egress uploads one MP3 per room as audio/mpeg; without it every upload is refused.
  test('the recordings bucket accepts audio/mpeg and still video/mp4', async () => {
    await rolledBack(async (tx) => {
      const [b] = await tx<{ mp3: boolean; mp4: boolean }[]>`select 'audio/mpeg' = any(allowed_mime_types) as mp3,
        'video/mp4' = any(allowed_mime_types) as mp4 from storage.buckets where id = 'recordings'`;
      expect(b).toEqual({ mp3: true, mp4: true });
    });
  });
});
