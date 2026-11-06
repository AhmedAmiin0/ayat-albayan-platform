import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { book, dayTimesPayload, seedSiblings, type DaySeed } from '../../support/teaching/day-times';
import { rolledBack, type Tx } from '../../support/edit-time';

// create_booking v8 (migration 20261106000201, PR #648 review): one course per package. The draft
// booked on payment and the assistant's own «احجز» carry different client_request_ids; the second
// is refused with course_exists, the same request again replays. Rolled back.

async function subscriptionOf(tx: Tx, s: DaySeed): Promise<string> {
  const [row] = await tx<{ id: string }[]>`insert into public.subscriptions
      (student_id, duration, lessons_total, price, price_source, starts_on)
    values (${s.students[0] ?? ''}, 45, 8, 0, '{}'::jsonb, current_date) returning id`;
  if (!row) throw new Error('subscription not written');
  return row.id;
}

const course = (s: DaySeed, sub: string | null, requestId: string) => {
  const base = dayTimesPayload(s, { requestId, siblings: false, invoice: false });
  return { ...base, rule: { ...base.rule, subscription_id: sub } };
};

const rulesOf = async (tx: Tx, sub: string) =>
  (await tx<{ n: number }[]>`select count(*)::int as n from public.schedule_rules where subscription_id = ${sub}`)[0]?.n;

test.describe('create_booking: one course per package (PR #648 review)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('a second booking of the package (another request) is refused course_exists', async () => {
    await rolledBack(async (tx) => {
      const s = await seedSiblings(tx);
      const sub = await subscriptionOf(tx, s);
      await book(tx, course(s, sub, randomUUID()), s.actor);
      const again = course(s, sub, randomUUID());
      const failure = (e: { code?: string; message?: string }) => `${e.code ?? ''} ${e.message ?? ''}`;
      const code = await tx.savepoint((sp) => book(sp, again, s.actor)).then(() => 'ok', failure);
      expect(code).toBe('P0001 course_exists');
      expect(await rulesOf(tx, sub)).toBe(1);
    });
  });

  test('the same request again replays its booking (no error, still one rule)', async () => {
    await rolledBack(async (tx) => {
      const s = await seedSiblings(tx);
      const sub = await subscriptionOf(tx, s);
      const id = randomUUID();
      const first = await book(tx, course(s, sub, id), s.actor);
      const replay = await book(tx, course(s, sub, id), s.actor);
      expect(replay.rule_id).toBe(first.rule_id);
      expect(await rulesOf(tx, sub)).toBe(1);
    });
  });

  test('bookings without a package (a trial, the admin) are not limited', async () => {
    await rolledBack(async (tx) => {
      const s = await seedSiblings(tx);
      const one = course(s, null, randomUUID());
      await book(tx, one, s.actor);
      const later = { ...one, rule: { ...one.rule, client_request_id: randomUUID(), start_time_local: '20:00' } };
      const lessons = later.lessons.map((l) => ({
        ...l,
        starts_at: shift(l.starts_at),
        ends_at: shift(l.ends_at),
      }));
      expect((await book(tx, { ...later, lessons }, s.actor)).rule_id).toBeTruthy();
    });
  });
});

/** Three hours later: the second plain booking does not touch the first one's lessons. */
const shift = (at: string) => new Date(Date.parse(at) + 3 * 3_600_000).toISOString();
