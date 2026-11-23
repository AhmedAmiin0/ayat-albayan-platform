import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { CorrectionsRepo } from './corrections.repo';

const VIEW = 'v_teacher_earnings_summary';
const raised = (message: string) => ({ error: { code: 'P0001', message } });
const pay = {
  payoutId: 'po1',
  actorId: 'a1',
  paidAt: '2026-11-20T09:00:00.000Z',
  method: 'bank',
  note: null,
  receiptPath: 'r/1.pdf',
};

describe('CorrectionsRepo: each correction is one rpc with its p_ arguments', () => {
  it('voidPayment → void_teacher_payment(p_payment, p_actor, p_reason)', async () => {
    const { db, trips, argsOf } = fakeDb({});
    await new CorrectionsRepo(db).voidPayment({ paymentId: 'pm1', actorId: 'a1', reason: 'x' });
    expect(trips).toEqual(['rpc:void_teacher_payment']);
    expect(argsOf('rpc:void_teacher_payment', 'rpc')).toEqual([
      { p_payment: 'pm1', p_actor: 'a1', p_reason: 'x' },
    ]);
  });

  it('payPayout → pay_payout(p_payout, p_actor, p) with the settlement as snake_case json', async () => {
    const { db, trips, argsOf } = fakeDb({});
    await new CorrectionsRepo(db).payPayout(pay);
    expect(trips).toEqual(['rpc:pay_payout']);
    const p = { paid_at: pay.paidAt, method: 'bank', note: null, receipt_path: 'r/1.pdf' };
    expect(argsOf('rpc:pay_payout', 'rpc')).toEqual([{ p_payout: 'po1', p_actor: 'a1', p }]);
  });

  it('unpayPayout and reopenPayout → unpay_payout / reopen_payout', async () => {
    const { db, trips, argsOf } = fakeDb({});
    const repo = new CorrectionsRepo(db);
    await repo.unpayPayout({ payoutId: 'po1', actorId: 'a1', reason: 'wrong' });
    await repo.reopenPayout({ payoutId: 'po2', actorId: 'a2' });
    expect(trips).toEqual(['rpc:unpay_payout', 'rpc:reopen_payout']);
    expect(argsOf('rpc:unpay_payout', 'rpc')).toEqual([
      { p_payout: 'po1', p_actor: 'a1', p_reason: 'wrong' },
    ]);
    expect(argsOf('rpc:reopen_payout', 'rpc')).toEqual([{ p_payout: 'po2', p_actor: 'a2' }]);
  });

  it('a raised ledger code maps to its HTTP error; any other error is a plain DB error', async () => {
    const { db } = fakeDb({
      'rpc:void_teacher_payment': [raised('already_voided')],
      'rpc:pay_payout': [raised('allocation_invalid')],
      'rpc:unpay_payout': [raised('payout_not_found')],
      'rpc:reopen_payout': [{ error: { code: 'XX000', message: 'boom' } }],
    });
    const repo = new CorrectionsRepo(db);
    const v = { paymentId: 'pm1', actorId: 'a1', reason: 'x' };
    await expect(repo.voidPayment(v)).rejects.toBeInstanceOf(ConflictException);
    await expect(repo.payPayout(pay)).rejects.toBeInstanceOf(BadRequestException);
    const u = { payoutId: 'po1', actorId: 'a1', reason: 'x' };
    await expect(repo.unpayPayout(u)).rejects.toBeInstanceOf(NotFoundException);
    const r = repo.reopenPayout({ payoutId: 'po1', actorId: 'a1' });
    await expect(r).rejects.toThrow('db error XX000: boom');
  });
});

describe('CorrectionsRepo.summary: the summary view, most owed first then by name', () => {
  it('one trip, select *, two orders, no filter or bound, rows returned as they are', async () => {
    const rows = [{ teacher_id: 't1', owed: 300 }, { teacher_id: 't2', owed: 0 }];
    const { db, calls, trips } = fakeDb({ [VIEW]: [{ data: rows }] });
    const out = await new CorrectionsRepo(db).summary();
    expect(trips).toEqual([VIEW]);
    expect(calls.map((c) => [c.method, ...c.args])).toEqual([
      ['select', '*'],
      ['order', 'owed', { ascending: false }],
      ['order', 'display_name_ar'],
    ]);
    expect(out).toBe(rows);
  });

  it('a database error is thrown; null data is passed through as null', async () => {
    const bad = fakeDb({ [VIEW]: [{ error: { code: 'XX000', message: 'boom' } }] });
    await expect(new CorrectionsRepo(bad.db).summary()).rejects.toThrow('db error XX000');
    expect(await new CorrectionsRepo(fakeDb({}).db).summary()).toBeNull();
  });
});
