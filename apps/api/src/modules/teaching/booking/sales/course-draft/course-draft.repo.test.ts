import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { CourseDraftRepo } from './course-draft.repo';
import { REQ, SUB } from './course-draft.fakes';

const ROW = { subscription_id: SUB, request: REQ, saved_by: 'a1000000-0000-4000-8000-00000000000a', saved_at: '2026-11-06T09:00:00.000Z' };
const NOW = new Date('2026-11-06T12:00:00.000Z');

describe('CourseDraftRepo (owner 2026-11-06)', () => {
  it('get: the row with its request parsed as a booking body; none, or a row that no longer parses → null', async () => {
    const broken = { ...ROW, request: { kind: 'x' } };
    const rows = [{ data: ROW }, { data: null }, { data: broken }];
    const t = fakeDb({ subscription_course_drafts: rows });
    const repo = new CourseDraftRepo(t.db);
    const draft = { subscriptionId: SUB, request: REQ, savedBy: ROW.saved_by };
    const stored = { ...draft, savedAt: ROW.saved_at };
    expect(await repo.get(SUB)).toEqual(stored);
    expect(await repo.get(SUB)).toBeNull();
    expect(await repo.get(SUB)).toBeNull();
  });

  it('save: one row per package (upsert on subscription_id), its new saved_at', async () => {
    const t = fakeDb({ subscription_course_drafts: [{ data: null }] });
    const draft = { subscriptionId: SUB, request: REQ, savedBy: ROW.saved_by };
    const at = await new CourseDraftRepo(t.db).save(draft);
    expect(Number.isNaN(Date.parse(at))).toBe(false);
    expect(t.argsOf('subscription_course_drafts', 'upsert')).toEqual([
      { subscription_id: SUB, request: REQ, saved_by: ROW.saved_by, saved_at: at },
      { onConflict: 'subscription_id' },
    ]);
  });

  it('held: unpaid AND an open, unexpired link; paid or no link → not held', async () => {
    const t = fakeDb({
      subscriptions: [{ data: { status: 'unpaid' } }, { data: { status: 'active' } }, { data: { status: 'unpaid' } }],
      payment_links: [{ data: [{ id: 'l1' }] }, { data: [{ id: 'l1' }] }, { data: [] }],
    });
    const repo = new CourseDraftRepo(t.db);
    expect(await repo.held(SUB, NOW)).toBe(true);
    expect(await repo.held(SUB, NOW)).toBe(false);
    expect(await repo.held(SUB, NOW)).toBe(false);
    expect(t.argsOf('payment_links', 'gt')).toEqual(['expires_at', NOW.toISOString()]);
  });
});
