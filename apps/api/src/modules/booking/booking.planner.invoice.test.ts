import { HttpException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingRequest, fakePlanner, IDS, leadRequest, NOW } from './booking.fakes';

const T1 = { id: 'T1', starts_at: new Date('2026-10-04T14:00:00Z'), ends_at: new Date('2026-10-04T14:45:00Z') };
const failure = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return { status: e.getStatus(), body: e.getResponse() };
};

describe('BookingPlanner — the invoice and the chats it may come from (R-PAY-03, R-MSG-06)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('a non-trial booking without an invoice is 400 invoice_required even on a clashing slot', async () => {
    const { planner, busy } = fakePlanner();
    busy.teacherLessons.mockResolvedValue([T1]);
    const res = await failure(planner.prepare(bookingRequest({ invoice: undefined })));
    expect(res).toMatchObject({ status: 400, body: { code: 'invoice_required' } });
  });

  it('a trial needs no invoice: a clash is the first answer', async () => {
    const { planner, busy } = fakePlanner();
    busy.teacherLessons.mockResolvedValue([T1]);
    const res = await failure(planner.prepare(bookingRequest({ package: 'trial', invoice: undefined, studentIds: [IDS.s1] })));
    expect(res).toMatchObject({ status: 409, body: { code: 'conflict' } });
  });

  it('the lead path may save from the lead\'s own chat as well as the typed guardian number', async () => {
    const { planner, queries } = fakePlanner();
    queries.lead.mockResolvedValue({ id: IDS.lead, status: 'new', source: null, qualification: {}, phone_e164: '+201001112223' });
    const { phones } = await planner.prepare(leadRequest({ invoice: undefined }));
    expect(phones).toEqual(['+966501234567', '+201001112223']);
  });
});
