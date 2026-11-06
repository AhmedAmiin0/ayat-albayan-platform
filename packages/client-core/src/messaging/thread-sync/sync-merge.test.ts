import type { SyncMessage, ThreadSync, ThreadView } from '@ab/shared';
import { encodeSyncCursor } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { EMPTY_SYNC, type SyncState } from './sync-cursor.js';
import { planSync, type HeldStamp } from './sync-merge.js';

const id = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const T1 = '2026-11-06T10:00:01.000001+00:00';
const T2 = '2026-11-06T10:00:02.000002+00:00';
const msg = (n: number, updated_at: string) =>
  ({ id: id(n), phone_e164: '+966500000001', created_at: T1, updated_at }) as SyncMessage;
const thread = { phone_e164: '+966500000001', last_message_id: id(1) } as ThreadView;
const answer = (over: Partial<ThreadSync> = {}): ThreadSync => ({
  messages: [],
  threads: [],
  gone: [],
  cursor: encodeSyncCursor({ at: T2, id: id(9) }),
  has_more: false,
  scope: 'admin',
  ...over,
});
const none: HeldStamp = () => undefined;
const held =
  (rows: Record<string, string>): HeldStamp =>
  (k) =>
    rows[k];
const synced: SyncState = {
  cursor: encodeSyncCursor({ at: T1, id: id(1) }),
  more: false,
  scope: 'admin',
};

describe('planSync (the phone store merge, docs/43 §5)', () => {
  it('first answer: every row, its threads, the cursor and scope', () => {
    const res = answer({ messages: [msg(1, T1)], threads: [thread], has_more: true });
    const plan = planSync(EMPTY_SYNC, res, none);
    expect(plan.reset).toBe(false);
    expect(plan.upsert.map((m) => m.id)).toEqual([id(1)]);
    expect(plan.threads).toEqual([thread]);
    expect(plan.state).toEqual({ cursor: answer().cursor, more: true, scope: 'admin' });
  });

  it('idempotent: the same answer again (cursor − 10 s overlap) upserts nothing', () => {
    const res = answer({ messages: [msg(1, T1), msg(2, T2)] });
    const again = planSync(synced, res, held({ [id(1)]: T1, [id(2)]: T2 }));
    expect(again.upsert).toEqual([]);
    expect(again.state.cursor).toBe(res.cursor);
  });

  it('a newer copy replaces the held one; an older one never does', () => {
    const res = answer({ messages: [msg(1, T2), msg(2, T1)] });
    const plan = planSync(synced, res, held({ [id(1)]: T1, [id(2)]: T2 }));
    expect(plan.upsert.map((m) => m.id)).toEqual([id(1)]);
  });

  it('two copies of one id in an answer: the latest wins', () => {
    const plan = planSync(synced, answer({ messages: [msg(3, T2), msg(3, T1)] }), none);
    expect(plan.upsert).toEqual([msg(3, T2)]);
    const flipped = planSync(synced, answer({ messages: [msg(3, T1), msg(3, T2)] }), none);
    expect(flipped.upsert).toEqual([msg(3, T2)]);
  });

  it('tombstones: gone ids are removed and never upserted', () => {
    const plan = planSync(synced, answer({ messages: [msg(4, T2)], gone: [id(4), id(5)] }), none);
    expect(plan.remove).toEqual([id(4), id(5)]);
    expect(plan.upsert).toEqual([]);
  });

  it('an older answer cursor never moves the mark back', () => {
    const ahead: SyncState = { ...synced, cursor: encodeSyncCursor({ at: T2, id: id(9) }) };
    const plan = planSync(ahead, answer({ cursor: synced.cursor }), none);
    expect(plan.state.cursor).toBe(ahead.cursor);
  });

  it('a full page behind the mark (a rewound window over one page) continues from its own tail', () => {
    const ahead: SyncState = { ...synced, cursor: encodeSyncCursor({ at: T2, id: id(9) }) };
    const plan = planSync(ahead, answer({ cursor: synced.cursor, has_more: true }), none);
    expect(plan.state).toMatchObject({ cursor: synced.cursor, more: true });
  });

  it('an empty answer (null cursor) keeps the mark', () => {
    expect(planSync(synced, answer({ cursor: null }), none).state.cursor).toBe(synced.cursor);
  });

  it('another scope: wipe, keep nothing of the answer, start again from the first row at once', () => {
    const res = answer({ messages: [msg(1, T2)], threads: [thread], scope: 'teacher:x' });
    const plan = planSync(synced, res, none);
    expect(plan).toEqual({
      reset: true,
      upsert: [],
      remove: [],
      threads: [],
      state: { cursor: null, more: true, scope: 'teacher:x' },
    });
  });
});
