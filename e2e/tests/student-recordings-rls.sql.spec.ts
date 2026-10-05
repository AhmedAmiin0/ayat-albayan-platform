import { expect, test } from '@playwright/test';
import { as, family, rolledBack, userId, type Tx } from '../support/rls';
import { USERS } from '../support/users';

// Migration 240: a guardian reads a lesson recording only when it is finished, not deleted, made
// visible by staff (visible_to_student), and the lesson is one of their own child's. The default
// is hidden; the admin still reads everything; the status 'deleted' needs deleted_at.
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

  test('only a visible, finished, undeleted recording of their own child’s lesson', async () => {
    await rolledBack(async (tx) => {
      const login = await userId(tx, USERS.teacher.email);
      const admin = await userId(tx, USERS.admin.email);
      const [t] = await tx<{ id: string }[]>`select id from public.teachers where profile_id = ${login}`;
      if (!t) throw new Error('teacher row missing (global setup)');
      const mine = await family(tx, { phone: '+966500000240', teacherId: t.id });
      const theirs = await family(tx, { phone: '+966500000241', teacherId: t.id });
      await tx`update public.guardians set profile_id = ${login} where phone_e164 = '+966500000240'`;
      const myLesson = await lessonOf(tx, { teacherId: t.id, studentId: mine });
      const theirLesson = await lessonOf(tx, { teacherId: t.id, studentId: theirs });
      await recording(tx, { lessonId: myLesson, tag: 'shown', visible: true });
      await recording(tx, { lessonId: myLesson, tag: 'hidden' });
      await recording(tx, { lessonId: myLesson, tag: 'failed', visible: true, status: 'failed' });
      await recording(tx, { lessonId: myLesson, tag: 'deleted', visible: true, status: 'deleted' });
      await recording(tx, { lessonId: theirLesson, tag: 'other-family', visible: true });
      const seen = (uid: string) =>
        as(tx, uid, () => tx<{ file_path: string }[]>`select file_path from public.lesson_recordings where file_path like '%rls240-%' order by file_path`);
      expect((await seen(login)).map((r) => r.file_path.split('rls240-')[1])).toEqual(['shown.mp4']);
      expect(await seen(admin)).toHaveLength(5);
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
});
