import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { IDS } from './booking.fakes';
import type { BookingPayload } from './booking.mapper';
import { BookingQueries } from './booking.queries';

const RESULT = {
  rule_id: 'R1',
  student_ids: [IDS.s1],
  guardian_ids: [IDS.g1],
  lessons: [{ id: 'L1', starts_at: '2026-10-04 14:00:00+00', ends_at: '2026-10-04 14:45:00+00' }],
  message_ids: ['M1'],
  invoice_id: 'I1',
};
const PAYLOAD = { rule: {} } as unknown as BookingPayload;
const book = (rpc: { data?: unknown; error?: { code?: string; message: string } }[]) => {
  const { db, calls } = fakeDb({ 'rpc:create_booking': rpc });
  return { run: () => new BookingQueries(db).createBooking(PAYLOAD, 'actor'), calls };
};
const failure = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return { status: e.getStatus(), body: e.getResponse() };
};

describe('BookingQueries.createBooking — makeup and invoice errors (R-SCH-10)', () => {
  it('returns the invoice id of the booking', async () => {
    const { run } = book([{ data: RESULT }]);
    expect(await run()).toMatchObject({ rule_id: 'R1', invoice_id: 'I1' });
  });

  it('P0001 makeup_not_eligible (the lesson changed meanwhile) → 409', async () => {
    const { run } = book([{ error: { code: 'P0001', message: 'makeup_not_eligible' } }]);
    expect(await failure(run())).toMatchObject({ status: 409, body: { code: 'makeup_not_eligible' } });
  });

  it('23505 lessons_makeup_of_key (another admin booked it a moment ago) → 409 makeup_exists', async () => {
    const message = 'duplicate key value violates unique constraint "lessons_makeup_of_key"';
    const { run, calls } = book([{ error: { code: '23505', message } }]);
    expect(await failure(run())).toMatchObject({ status: 409, body: { code: 'makeup_exists' } });
    expect(calls).toHaveLength(1);
  });

  it('23505 on client_request_id retries once and returns the winner\'s booking (also with an invoice)', async () => {
    const message = 'duplicate key value violates unique constraint "invoices_client_request_id_key"';
    const { run, calls } = book([{ error: { code: '23505', message } }, { data: RESULT }]);
    expect(await run()).toMatchObject({ invoice_id: 'I1' });
    expect(calls).toHaveLength(2);
  });
});

describe('BookingQueries — makeupOriginal / invoiceByRequest', () => {
  it('invoiceByRequest maps the stored row and ignores a request with none', async () => {
    const row = { kind: 'makeup', storage_path: 'r/a.png', mime: 'image/png', size_bytes: 9, source: 'whatsapp', message_id: 'M1' };
    const { db, argsOf } = fakeDb({ invoices: [{ data: row }, { data: null }] });
    const q = new BookingQueries(db);
    expect(await q.invoiceByRequest('r')).toEqual({
      kind: 'makeup',
      path: 'r/a.png',
      mime: 'image/png',
      size_bytes: 9,
      source: 'whatsapp',
      message_id: 'M1',
    });
    expect(argsOf('invoices', 'eq')).toEqual(['client_request_id', 'r']);
    expect(await q.invoiceByRequest('r')).toBeNull();
  });

  it('makeupOriginal reads the lesson with its rule package and students', async () => {
    const lesson = { id: IDS.missed, status: 'no_show' };
    const { db, argsOf } = fakeDb({ lessons: [{ data: lesson }] });
    expect(await new BookingQueries(db).makeupOriginal(IDS.missed)).toEqual(lesson);
    expect(argsOf('lessons', 'eq')).toEqual(['id', IDS.missed]);
  });
});
