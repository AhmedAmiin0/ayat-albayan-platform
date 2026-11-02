import { expect, test } from '@playwright/test';
import {
  book,
  dayTimesPayload,
  seedSiblings,
  type DaySeed,
} from '../../support/teaching/day-times';
import { rolledBack, type Tx } from '../../support/edit-time';

// «انعقدت» by default (owner 2026-11-02): the auto-held job's change set through the real
// apply_lesson_changes (AutoHeldService: scheduled → completed, attendance and chargeable
// untouched,
// audit reason auto_held, actor null), then its correction (completed → cancelled_by_teacher, not
// chargeable). Pins what it does to the package balance and to teacher pay (sync_teacher_earning,
// migration 200: a completed non-trial lesson earns its rate, as a reported one does). Rolled back.

type Seeded = DaySeed & { lessonId: string; subscriptionId: string };

async function seeded(tx: Tx): Promise<Seeded> {
  const s = await seedSiblings(tx);
  await tx`update public.teachers set rate_45 = 70 where id = ${s.teacher}`;
  const [sub] = await tx<{ id: string }[]>`insert into public.subscriptions
      (student_id, duration, lessons_total, price, price_source, starts_on)
    values (${s.students[0] ?? ''}, 45, 8, 0, '{}'::jsonb, current_date) returning id`;
  const one = { ...s, students: s.students.slice(0, 1) };
  const booked = await book(
    tx,
    dayTimesPayload(one, { requestId: null, siblings: false, invoice: false }),
    s.actor,
  );
  const lessonId = booked.lessons[0]?.id;
  if (!sub || !lessonId) throw new Error('seed failed');
  return { ...s, lessonId, subscriptionId: sub.id };
}

const autoHeld = (lessonId: string) => ({
  actor: null,
  changes: [{ id: lessonId, from_status: 'scheduled', to_status: 'completed' }],
  audit: {
    entity: 'lessons',
    entity_id: lessonId,
    action: 'status_change',
    before: { status: 'scheduled' },
    after: { status: 'completed', reason: 'auto_held' },
  },
});

const apply = (tx: Tx, p: object) => tx`select public.apply_lesson_changes(${tx.json(p as never)})`;

async function facts(tx: Tx, s: Seeded) {
  const [row] = await tx<
    { status: string; used: number; amount: string | null; chargeable: boolean }[]
  >`
    select l.status::text, b.lessons_used::int as used, e.amount::text, ls.chargeable
      from public.lessons l
      join public.lesson_students ls on ls.lesson_id = l.id
      join public.v_subscription_balance b on b.subscription_id = ${s.subscriptionId}
      left join public.teacher_session_earnings e on e.lesson_id = l.id
     where l.id = ${s.lessonId}`;
  return row;
}

test.describe('auto-held lessons: balance and teacher pay (owner 2026-11-02)', () => {
  test.beforeEach(() =>
    test.skip(test.info().project.name !== 'desktop', 'database only: one run'),
  );

  test('held: counted once on the package, earns the rate; a second pass loses the compare-and-set', async () => {
    await rolledBack(async (tx) => {
      const s = await seeded(tx);
      expect(await facts(tx, s)).toEqual({
        status: 'scheduled',
        used: 0,
        amount: null,
        chargeable: true,
      });
      await apply(tx, autoHeld(s.lessonId));
      expect(await facts(tx, s)).toEqual({
        status: 'completed',
        used: 1,
        amount: '70.00',
        chargeable: true,
      });
      const again = await tx
        .savepoint(() => apply(tx, autoHeld(s.lessonId)))
        .then(
          () => 'ok',
          (e: unknown) => (e instanceof Error ? e.message : String(e)),
        );
      expect(again).toBe('invalid_transition');
      const audit = await tx`select actor_id from public.audit_log
        where entity_id = ${s.lessonId} and after ->> 'reason' = 'auto_held'`;
      expect(audit).toEqual([{ actor_id: null }]);
    });
  });

  test('corrected to «ألغاها المعلم/ة»: off the package and its unpaid earning gone', async () => {
    await rolledBack(async (tx) => {
      const s = await seeded(tx);
      await apply(tx, autoHeld(s.lessonId));
      await apply(tx, {
        actor: s.actor,
        changes: [
          {
            id: s.lessonId,
            from_status: 'completed',
            to_status: 'cancelled_by_teacher',
            chargeable: false,
          },
        ],
      });
      expect(await facts(tx, s)).toEqual({
        status: 'cancelled_by_teacher',
        used: 0,
        amount: null,
        chargeable: false,
      });
    });
  });
});
