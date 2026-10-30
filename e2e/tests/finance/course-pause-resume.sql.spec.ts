import { expect, test } from '@playwright/test';
import { day, groupOf, pauseOf, resume, seedPause, start, statuses } from '../../support/finance/course-pause';
import { rolledBack } from '../../support/teaching/edit-time';

// «إيقاف الدورة مؤقتًا» resume edge cases (docs/11 §7b, migration 20261028000956) against the real database, rolled
// back: siblings both paused on one group rule, and a course that began inside the pause.

test.describe('course pause resume (docs/11 §7b)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('two students paused on one group rule: each resume brings back exactly its own student', async () => {
    await rolledBack(async (tx) => {
      const s = await seedPause(tx);
      // The first leaves the group lessons (days 2 and 4); the second is then alone: they are cancelled.
      const first = (await start(tx, pauseOf(s, 0, 5))) as { id: string; left: string[] };
      const second = (await start(tx, { ...pauseOf(s, 0, 5), student_id: s.other })) as { id: string; cancelled: string[] };
      expect([first.left.length, second.cancelled.length]).toEqual([2, 2]);
      expect(await groupOf(tx, s.group)).toEqual([]);
      // The first-paused resumes first: the lessons come back with it alone (handed over), the other stays out.
      const back = await resume(tx, { pause_id: first.id, actor: s.actor, on: s.today });
      expect((back['rejoined'] as string[]).length).toBe(2);
      expect((await groupOf(tx, s.group)).map((g) => [g.day, [...g.students].sort()])).toEqual([[2, [s.student]], [4, [s.student]]]);
      const [kinds] = await tx<{ k: string[] }[]>`select array_agg(kind order by kind) as k from public.course_pause_lessons where pause_id = ${second.id}`;
      expect(kinds?.k).toEqual(['left', 'left']);
      // The second resumes: both on every group lesson again.
      await resume(tx, { pause_id: second.id, actor: s.actor, on: s.today });
      const both = [s.student, s.other].sort();
      expect((await groupOf(tx, s.group)).map((g) => [g.day, [...g.students].sort()])).toEqual([[2, both], [4, both]]);
    });
  });

  test('a course that started inside the pause moves only by the days it was paused', async () => {
    await rolledBack(async (tx) => {
      const s = await seedPause(tx);
      const { id } = (await start(tx, pauseOf(s, 0, 5))) as { id: string };
      // As if paused from 14 days ago to 3 days ago, the package and the solo rule starting 6 days ago (inside it).
      await tx`update public.course_pauses set from_date = ${day(s.today, -14)}, until_date = ${day(s.today, -3)} where id = ${id}`;
      await tx`update public.subscriptions set starts_on = ${day(s.today, -6)} where id = ${s.sub}`;
      await tx`update public.schedule_rules set starts_on = ${day(s.today, -6)} where id = ${s.solo}`;
      const out = await resume(tx, { pause_id: id, actor: null });
      // The pause lasted 12 days (extended_days); the course was paused for 4 of them (days −6 … −3).
      expect([out['resumed'], out['days']]).toEqual([true, 12]);
      expect(await statuses(tx, s)).toMatchObject({ renews: day(s.today, 34), ends: day(s.today, 34), rule: 'active' });
      const [row] = await tx<{ d: number }[]>`select extended_days as d from public.course_pauses where id = ${id}`;
      expect(row?.d).toBe(12);
    });
  });
});
