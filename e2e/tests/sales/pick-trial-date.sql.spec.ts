import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/edit-time';
import { bookPayload, movePayload, seedTrial, type TrialSeed } from '../../support/sales/trial-date';

// pick_trial_date (migration 20261025000660, owner 2026-10-25 «موعد تجريبي جديد»): the move or the
// booking, the student → trial and the audit rows in one transaction (via = trial_new_date since
// 20261025000661). Rolled back.

type Pick = ReturnType<typeof movePayload> | ReturnType<typeof bookPayload>;
const pick = (tx: Tx, p: Pick) => tx<{ r: { lesson_id: string; moved_from_id: string | null } }[]>`select public.pick_trial_date(${tx.json(p)}) as r`;
const statusOf = async (tx: Tx, s: TrialSeed) => (await tx<{ status: string }[]>`select status::text from public.students where id = ${s.student}`)[0]?.status;
const trialAudits = (tx: Tx, s: TrialSeed) =>
  tx`select 1 from public.audit_log where entity = 'students' and entity_id = ${s.student} and action = 'status_change' and after ->> 'via' = 'trial_new_date'`;

test.describe('pick_trial_date: a new trial date in one transaction (R-SCH-07, R-STU-05)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a move: the old trial rescheduled, the new row linked to it, the student → trial (audited)', async () => {
    await rolledBack(async (tx) => {
      const s = await seedTrial(tx);
      const p = movePayload(s);
      const [row] = await pick(tx, p);
      expect(row?.r).toMatchObject({ lesson_id: p.change.lessons[0]?.id, moved_from_id: s.lesson });
      const [old] = await tx<{ status: string }[]>`select status::text from public.lessons where id = ${s.lesson}`;
      expect(old?.status).toBe('rescheduled');
      expect(await statusOf(tx, s)).toBe('trial');
      expect(await trialAudits(tx, s)).toHaveLength(1);
    });
  });

  test('the same move again is a replay: nothing new is written', async () => {
    await rolledBack(async (tx) => {
      const s = await seedTrial(tx);
      const p = movePayload(s);
      await pick(tx, p);
      const [again] = await pick(tx, p);
      expect(again?.r.moved_from_id).toBe(s.lesson);
      const lessons = await tx`select 1 from public.lessons where rule_id = ${s.rule}`;
      expect(lessons).toHaveLength(2);
      expect(await trialAudits(tx, s)).toHaveLength(1);
    });
  });

  test('a subscribed student is refused (trial_date_subscribed), nothing written', async () => {
    await rolledBack(async (tx) => {
      const s = await seedTrial(tx);
      await tx`update public.students set status = 'active' where id = ${s.student}`;
      const failed = await tx.savepoint(() => pick(tx, movePayload(s))).then(() => 'ok', (e: { message?: string }) => e.message);
      expect(failed).toBe('trial_date_subscribed');
      const [old] = await tx<{ status: string }[]>`select status::text from public.lessons where id = ${s.lesson}`;
      expect(old?.status).toBe('scheduled');
    });
  });

  test('a booking (no upcoming trial): a new trial rule and lesson, the student → trial', async () => {
    await rolledBack(async (tx) => {
      const s = await seedTrial(tx);
      // No upcoming trial (the seeded one was cancelled), else the booking is refused (migration 661).
      await tx`update public.lessons set status = 'cancelled_by_admin' where id = ${s.lesson}`;
      const [row] = await pick(tx, bookPayload(s));
      expect(row?.r.moved_from_id).toBeNull();
      const [rule] = await tx<{ package: string }[]>`select r.package::text from public.lessons l
        join public.schedule_rules r on r.id = l.rule_id where l.id = ${row?.r.lesson_id ?? ''}`;
      expect(rule?.package).toBe('trial');
      expect(await statusOf(tx, s)).toBe('trial');
    });
  });
});
