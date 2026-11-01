import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingRequest, fakePlanner, IDS, NOW } from '@/modules/teaching/booking/booking.fakes';
import type { BookingInvoices } from '@/modules/teaching/booking/invoice/booking.invoice';
import type { BookingRepo } from './booking.repo';
import { BookingService } from './booking.service';
import { BookingWriter } from './booking.writer';
import { fakeTeacherAlert } from '@/modules/teaching/booking/teacher/teacher-alert.fakes';

const FIRST = { rule_id: 'R1', student_ids: [IDS.s1], guardian_ids: [IDS.g1], lessons: [], message_ids: [], invoice_id: 'I1' };
const REQUEST = 'c0000000-0000-4000-8000-0000000000c1';

function setup() {
  const deps = fakePlanner();
  const alert = fakeTeacherAlert();
  const writer = new BookingWriter(deps.queries as unknown as BookingRepo, { resolve: vi.fn() } as unknown as BookingInvoices, alert.after);
  return { ...deps, alert, service: new BookingService(deps.planner, writer, deps.queries as unknown as BookingRepo) };
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

  it('a replayed trial booking re-runs the idempotent trial evaluate only: no teacher alert, no push', async () => {
    const { service, queries, alert } = setup();
    queries.replay.mockResolvedValue(FIRST);
    const req = bookingRequest({ clientRequestId: REQUEST, package: 'trial' });
    expect(await service.book(req, 'actor')).toEqual(FIRST);
    expect(alert.trial.evaluate).toHaveBeenCalledWith([IDS.s1], 'actor');
    expect(alert.queries.lessons).not.toHaveBeenCalled();
    expect(alert.push.notifyProfiles).not.toHaveBeenCalled();
    expect(alert.sender.kick).not.toHaveBeenCalled();
    const pkg = setup();
    pkg.queries.replay.mockResolvedValue(FIRST);
    await pkg.service.book(bookingRequest({ clientRequestId: REQUEST }), 'actor');
    expect(pkg.alert.trial.evaluate).not.toHaveBeenCalled();
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
