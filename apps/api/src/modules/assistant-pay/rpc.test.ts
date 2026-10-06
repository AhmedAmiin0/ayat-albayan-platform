import { PostgrestError } from '@supabase/supabase-js';
import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { assistantError } from './assistant-pay.errors';
import { AssistantRpc } from './assistant-pay.rpc';
import { CommissionsQueries } from './commissions.queries';
import { TermsQueries } from './terms.queries';

const pg = (code: string, message: string) => new PostgrestError({ message, details: '', hint: '', code });
const thrown = (p: Promise<unknown>): Promise<Error> => p.then(() => new Error('did not throw'), (e: Error) => e);
const err = (message: string, code = 'P0001') => ({ error: { code, message } });
const status = (e: Error): [number, unknown] => (e instanceof HttpException ? [e.getStatus(), (e.getResponse() as { code?: string }).code] : [0, e.message]);

describe('assistantError: the RPC codes of migrations 272 / 273 become HTTP', () => {
  it.each([
    ['invalid_month', 400], ['invalid_amount', 400], ['reason_required', 400], ['invalid_assistant', 400],
    ['assistant_not_found', 404], ['statement_not_found', 404], ['commission_not_found', 404], ['student_not_found', 404],
    ['invalid_transition', 409], ['empty_statement', 409], ['reversal_in_later_statement', 409], ['already_voided', 409], ['commission_exists', 409],
  ])('%s -> %i with the code', (code, http) => {
    expect(status(assistantError(pg('P0001', code)))).toEqual([http, code]);
  });

  it('another P0001 message or another SQLSTATE stays a plain database error (no HTTP code leaked)', () => {
    expect(assistantError(pg('P0001', 'something_else'))).not.toBeInstanceOf(HttpException);
    expect(assistantError(pg('57014', 'invalid_transition'))).not.toBeInstanceOf(HttpException);
  });
});

describe('AssistantRpc: arguments as migration 273 names them', () => {
  it('generate sends the first day of the month and returns the statement id', async () => {
    const { db, argsOf } = fakeDb({ 'rpc:generate_assistant_statement': [{ data: { statement_id: 's1', totals: {} } }] });
    expect(await new AssistantRpc(db).generate({ assistantId: 'a', month: '2026-10-01', actorId: 'adm' })).toBe('s1');
    expect(argsOf('rpc:generate_assistant_statement', 'rpc')).toEqual([{ p_assistant: 'a', p_month: '2026-10-01', p_actor: 'adm' }]);
  });

  it('pay sends the payload jsonb with snake_case keys', async () => {
    const { db, argsOf } = fakeDb({ 'rpc:pay_assistant_statement': [{ data: {} }] });
    await new AssistantRpc(db).pay({ statementId: 's1', actorId: 'adm', paid: { paidAt: 't', method: 'bank', note: null, receiptPath: 'p' } });
    expect(argsOf('rpc:pay_assistant_statement', 'rpc')).toEqual([{ p_statement: 's1', p_actor: 'adm', p: { paid_at: 't', method: 'bank', note: null, receipt_path: 'p' } }]);
  });

  it('brought-by: p_assistant null clears, p_brought_at is sent only when given; returns how many changed', async () => {
    const { db, calls } = fakeDb({ 'rpc:set_students_brought_by': [{ data: { changed: 3 } }, { data: { changed: 0 } }] });
    const rpc = new AssistantRpc(db);
    expect(await rpc.broughtBy({ studentIds: ['s1'], assistantId: null, actorId: 'adm' })).toBe(3);
    expect(await rpc.broughtBy({ studentIds: ['s1'], assistantId: 'a', actorId: 'adm', broughtAt: 'when' })).toBe(0);
    expect(calls.map((c) => c.args[0])).toEqual([
      { p_students: ['s1'], p_assistant: null, p_actor: 'adm' },
      { p_students: ['s1'], p_assistant: 'a', p_actor: 'adm', p_brought_at: 'when' },
    ]);
  });

  it('a P0001 from any RPC is thrown as its HTTP error', async () => {
    const { db } = fakeDb({ 'rpc:approve_assistant_statement': [err('empty_statement')], 'rpc:void_assistant_commission': [err('already_voided')] });
    const rpc = new AssistantRpc(db);
    expect(status(await thrown(rpc.approve('s1', 'adm')))).toEqual([409, 'empty_statement']);
    expect(status(await thrown(rpc.voidCommission({ commissionId: 'c', actorId: 'adm', reason: 'سبب' })))).toEqual([409, 'already_voided']);
  });
});

describe('TermsQueries.uncommissioned', () => {
  it('one subscription (the oldest) per brought student that has no commission; none brought, none read', async () => {
    const { db } = fakeDb({
      students: [{ data: [{ id: 's1' }, { id: 's2' }, { id: 's3' }] }],
      assistant_commissions: [{ data: [{ student_id: 's2' }] }],
      subscriptions: [{ data: [{ id: 'x1', student_id: 's1' }, { id: 'x2', student_id: 's1' }, { id: 'y1', student_id: 's2' }, { id: 'z1', student_id: 's3' }] }],
    });
    expect(await new TermsQueries(db).uncommissioned('a')).toEqual(['x1', 'z1']);
    const none = fakeDb({ students: [{ data: [] }] });
    expect(await new TermsQueries(none.db).uncommissioned('a')).toEqual([]);
    expect(none.calls.map((c) => c.table)).not.toContain('subscriptions');
  });
});

describe('CommissionsQueries.recentAdjustment: the replay guard', () => {
  it('matches the same assistant, amount, currency, reason and admin in the last minute', async () => {
    const { db, calls } = fakeDb({ assistant_adjustments: [{ data: [{ id: 'adj-1' }] }, { data: [] }] });
    const q = new CommissionsQueries(db);
    const input = { assistantId: 'a', amount: -5, currency: 'SAR', reason: 'خصم', actorId: 'adm' };
    expect(await q.recentAdjustment(input)).toBe('adj-1');
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([
      ['assistant_id', 'a'], ['kind', 'manual'], ['amount', -5], ['currency', 'SAR'], ['reason', 'خصم'], ['created_by', 'adm'],
    ]);
    expect(await q.recentAdjustment(input)).toBeNull();
  });
});
