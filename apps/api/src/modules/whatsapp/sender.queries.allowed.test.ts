import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { DUE_COLUMNS } from './sender.due';
import { SenderQueries } from './sender.queries';

// WA_ALLOWED_RECIPIENTS in SQL (docs/12 §13.5a) and the line stamp at claim (§13.2).

const M = 'messages';
const NOW = new Date('2026-10-02T08:00:00Z');
const phoneFilter = (calls: { method: string; args: unknown[] }[]) =>
  calls.filter((c) => c.method === 'in' && c.args[0] === 'phone_e164').map((c) => c.args);

describe('SenderQueries — allow-list and line', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('with an allow-list, due() and holdAutomatic() read only the listed phones', async () => {
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', '+20 100 123 4567, 966551234567');
    const { db, calls } = fakeDb({ [M]: [{ data: [] }, { data: [] }] });
    const q = new SenderQueries(db);
    await q.due({ keys: [], now: NOW, limit: 50 });
    expect(phoneFilter(calls)).toEqual([['phone_e164', ['+201001234567', '+966551234567']]]);
    await q.holdAutomatic();
    expect(phoneFilter(calls)).toHaveLength(2);
    expect(phoneFilter(calls)[1]).toEqual(['phone_e164', ['+201001234567', '+966551234567']]);
  });

  it('the list is read at construction: stubbing after it changes nothing', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    const q = new SenderQueries(db);
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', '+201001234567');
    await q.due({ keys: [], now: NOW, limit: 50 });
    expect(phoneFilter(calls)).toEqual([]);
  });

  it('without an allow-list neither query filters by phone', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [] }, { data: [] }] });
    const q = new SenderQueries(db);
    await q.due({ keys: ['booking_confirmation'], now: NOW, limit: 50 });
    await q.holdAutomatic();
    expect(phoneFilter(calls)).toEqual([]);
    expect(q.allowed).toBeNull();
  });

  it('claim stamps `line` only when given', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [{ id: 'm1' }] }, { data: [{ id: 'm1' }] }] });
    const q = new SenderQueries(db);
    await q.claim({ id: 'm1', attempts: 0, now: NOW });
    await q.claim({ id: 'm1', attempts: 0, now: NOW, line: 'chat' });
    const updates = calls.filter((c) => c.method === 'update').map((c) => c.args[0]);
    expect(updates).toEqual([
      { attempts: 1, next_attempt_at: '2026-10-02T08:02:00.000Z', error_code: 'sending' },
      { attempts: 1, next_attempt_at: '2026-10-02T08:02:00.000Z', error_code: 'sending', line: 'chat' },
    ]);
  });

  it('due() selects the line column', async () => {
    expect(DUE_COLUMNS.split(', ')).toContain('line');
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    await new SenderQueries(db).due({ keys: [], now: NOW, limit: 1 });
    expect(calls.find((c) => c.method === 'select')?.args[0]).toBe(DUE_COLUMNS);
  });
});
