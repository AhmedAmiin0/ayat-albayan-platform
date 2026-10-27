import { describe, expect, it, vi } from 'vitest';
import { FAMILY, LINE, fakeGate, fakeKit } from '../calls.fakes';
import type { CallRow } from '../store/call-row';
import { CallsSweeper, overdue, UNANSWERED_MS } from './calls.sweeper';

vi.mock('../kapso/calling-line', () => ({ callingLine: vi.fn(() => LINE) }));

const T0 = '2026-10-26T10:00:00.000Z';
const at = (ms: number) => new Date(Date.parse(T0) + ms);
const row = (over: Partial<CallRow>) => ({ direction: 'outbound', status: 'ringing', started_at: T0, updated_at: T0, answered_at: null, ...over }) as CallRow;

describe('overdue', () => {
  it('an accept counts from its claim and talk from the answer, never from the first ring', () => {
    const late = at(50_000).toISOString();
    expect(overdue(row({ direction: 'inbound', status: 'accepting', updated_at: late }), at(70_000))).toBeNull();
    expect(overdue(row({ direction: 'inbound', status: 'accepting', updated_at: late }), at(81_000))).toBe('failed');
    expect(overdue(row({ status: 'active', answered_at: late }), at(4 * 3_600_000 + 1))).toBeNull();
  });

  it('outbound unanswered after 45 s; inbound ringing after 60 s; accepting after 30 s; active after 4 h', () => {
    expect(overdue(row({}), at(UNANSWERED_MS))).toBeNull();
    expect(overdue(row({}), at(UNANSWERED_MS + 1))).toBe('no_answer');
    expect(overdue(row({ status: 'connecting' }), at(46_000))).toBe('no_answer');
    expect(overdue(row({ direction: 'inbound' }), at(46_000))).toBeNull();
    expect(overdue(row({ direction: 'inbound' }), at(61_000))).toBe('missed');
    expect(overdue(row({ direction: 'inbound', status: 'accepting' }), at(31_000))).toBe('failed');
    expect(overdue(row({ status: 'active' }), at(3_600_000))).toBeNull();
    expect(overdue(row({ status: 'active' }), at(4 * 3_600_000 + 1))).toBe('hangup');
    expect(overdue(row({ status: 'ended' }), at(10 * 3_600_000))).toBeNull();
  });
});

describe('CallsSweeper.runOnce', () => {
  it('ends an unanswered outbound call (terminate on WhatsApp first) and a missed inbound one (no Kapso call)', async () => {
    const { kit, queries, api } = fakeKit();
    const out = await queries.insert({ direction: 'outbound', status: 'ringing', phone_e164: FAMILY, wa_call_id: 'w.out', started_at: T0 });
    const inb = await queries.insert({ direction: 'inbound', status: 'ringing', phone_e164: FAMILY, wa_call_id: 'w.in', started_at: T0 });
    const sweeper = new CallsSweeper(kit, fakeGate());
    expect(await sweeper.runOnce(at(61_000))).toBe(2);
    expect(api.terminate).toHaveBeenCalledTimes(1);
    expect(api.terminate).toHaveBeenCalledWith(LINE, 'w.out');
    expect(queries.rows.get(out?.id ?? '')).toMatchObject({ status: 'ended', end_reason: 'no_answer' });
    expect(queries.rows.get(inb?.id ?? '')).toMatchObject({ status: 'ended', end_reason: 'missed' });
    expect(await sweeper.runOnce(at(120_000))).toBe(0);
  });

  it('never throws', async () => {
    const { kit, queries } = fakeKit();
    vi.spyOn(queries, 'live').mockRejectedValue(new Error('db down'));
    await expect(new CallsSweeper(kit, fakeGate()).runOnce()).resolves.toBe(0);
  });
});
