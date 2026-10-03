import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingRequest, fakePlanner, IDS, NOW } from './booking.fakes';
import type { BookingInvoices } from './booking.invoice';
import type { BookingQueries } from './booking.queries';
import { BookingService } from './booking.service';
import { BookingWriter } from './booking.writer';
import type { MessageSender } from '../whatsapp/message.sender';

const FIRST = { rule_id: 'R1', student_ids: [IDS.s1], guardian_ids: [IDS.g1], lessons: [], message_ids: [], invoice_id: 'I1' };
const REQUEST = 'c0000000-0000-4000-8000-0000000000c1';

function setup() {
  const deps = fakePlanner();
  const writer = new BookingWriter(
    deps.queries as unknown as BookingQueries,
    { resolve: vi.fn() } as unknown as BookingInvoices,
    { kick: vi.fn() } as unknown as MessageSender,
  );
  return { ...deps, service: new BookingService(deps.planner, writer, deps.queries as unknown as BookingQueries) };
}

describe('BookingService replay (rule 8)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('the same clientRequestId again returns its booking, with no plan, no conflict and no write', async () => {
    const { service, queries, busy } = setup();
    queries.replay.mockResolvedValue(FIRST);
    // The booking's own lessons now occupy the slot: planned again they would be a 409.
    busy.teacherLessons.mockResolvedValue([{ id: 'L1', starts_at: new Date('2026-10-04T14:00:00Z'), ends_at: new Date('2026-10-04T14:45:00Z') }]);
    expect(await service.book(bookingRequest({ clientRequestId: REQUEST }), 'actor')).toEqual(FIRST);
    expect(queries.replay).toHaveBeenCalledWith(REQUEST);
    expect(queries.createBooking).not.toHaveBeenCalled();
    expect(busy.teacherLessons).not.toHaveBeenCalled();
  });

  it('a request without an id, or a new one, is planned and written', async () => {
    const { service, queries } = setup();
    queries.createBooking.mockResolvedValue(FIRST);
    await service.book(bookingRequest({ clientRequestId: REQUEST }), 'actor');
    expect(queries.createBooking).toHaveBeenCalledTimes(1);
    await service.book(bookingRequest(), 'actor');
    expect(queries.replay).toHaveBeenCalledTimes(1);
  });
});
