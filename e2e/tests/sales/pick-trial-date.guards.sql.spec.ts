import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/teaching/edit-time';
import { bookPayload, movePayload, seedTrial } from '../../support/sales/trial-date';

// pick_trial_date's guards (migration 20261025000661, PR #164 review): an imported trial stays a
// trial when moved, a booking never adds a second upcoming trial, and a request id can only
// replay its own students' pick. Rolled back.

type Pick = Parameters<Tx['json']>[0];
const pick = (tx: Tx, p: Pick) => tx<{ r: { lesson_id: string } }[]>`select public.pick_trial_date(${tx.json(p)}) as r`;
const refused = (tx: Tx, p: Pick) => tx.savepoint(() => pick(tx, p)).then(() => 'ok', (e: { message?: string }) => e.message);

test.describe('pick_trial_date guards (R-SCH-12)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a moved imported trial (no rule): the new row is not chargeable, so still a trial', async () => {
    await rolledBack(async (tx) => {
      const s = await seedTrial(tx);
      await tx`update public.lessons set rule_id = null where id = ${s.lesson}`;
      const p = movePayload(s);
      const [row] = await pick(tx, { ...p, change: { ...p.change, lessons: p.change.lessons.map((l) => ({ ...l, rule_id: null })) } });
      const [ls] = await tx<{ chargeable: boolean }[]>`select chargeable from public.lesson_students where lesson_id = ${row?.r.lesson_id ?? ''}`;
      expect(ls?.chargeable).toBe(false);
    });
  });

  test('a booking while an upcoming trial exists → trial_changed, nothing written; its own replay passes', async () => {
    await rolledBack(async (tx) => {
      const s = await seedTrial(tx);
      expect(await refused(tx, bookPayload(s))).toBe('trial_changed');
      const rules = await tx`select 1 from public.schedule_rule_students where student_id = ${s.student}`;
      expect(rules).toHaveLength(1);
      await tx`update public.lessons set status = 'cancelled_by_admin' where id = ${s.lesson}`;
      const p = bookPayload(s);
      const [first] = await pick(tx, p);
      const [again] = await pick(tx, p);
      expect(again?.r.lesson_id).toBe(first?.r.lesson_id);
    });
  });

  test('a request id that is another lesson → trial_date_invalid; trial_date_replay is per student', async () => {
    await rolledBack(async (tx) => {
      const s = await seedTrial(tx);
      expect(await refused(tx, movePayload(s, s.lesson))).toBe('trial_date_invalid');
      const p = movePayload(s);
      const [row] = await pick(tx, p);
      const id = row?.r.lesson_id ?? '';
      const replay = (student: string) => tx<{ r: { lesson_id: string } | null }[]>`select public.trial_date_replay(${id}, ${student}) as r`;
      expect((await replay(s.student))[0]?.r?.lesson_id).toBe(id);
      expect((await replay(s.students[1] ?? ''))[0]?.r).toBeNull();
    });
  });
});
