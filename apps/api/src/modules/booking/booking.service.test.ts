import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingRequest, fakePlanner, IDS, NOW } from './booking.fakes';
import type { BookingInvoices } from './booking.invoice';
import type { InvoiceRow } from './booking.mapper';
import type { BookingQueries } from './booking.queries';
import { BookingService } from './booking.service';
import { BookingWriter } from './booking.writer';
import { fakeTeacherAlert } from './teacher-alert.fakes';

const ACTOR = 'a0000000-0000-4000-8000-000000000001';
const RESULT = {
  rule_id: 'R1',
  student_ids: [IDS.s1, IDS.s2],
  guardian_ids: [IDS.g1],
  lessons: [{ id: 'L1', starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z' }],
  message_ids: ['M1'],
  invoice_id: 'I1',
};
const INVOICE: InvoiceRow = {
  kind: 'package',
  path: 'req/a.png',
  mime: 'image/png',
  size_bytes: 10,
  source: 'upload',
  message_id: null,
};
function setup() {
  const deps = fakePlanner();
  deps.queries.createBooking.mockResolvedValue(RESULT);
  const { after, sender, trial } = fakeTeacherAlert();
  const invoices = { resolve: vi.fn().mockResolvedValue(INVOICE) };
  const writer = new BookingWriter(deps.queries as unknown as BookingQueries, invoices as unknown as BookingInvoices, after);
  const service = new BookingService(deps.planner, writer, deps.queries as unknown as BookingQueries);
  return { ...deps, service, sender, invoices, trial };
}
type Queries = ReturnType<typeof setup>['queries'];
const sentAudit = (queries: Queries) => queries.createBooking.mock.calls[0]?.[0]?.audit;
const T1 = { id: 'T1', starts_at: new Date('2026-10-04T14:00:00Z'), ends_at: new Date('2026-10-04T14:45:00Z') };

describe('BookingService (R-SCH-06, R-SCH-04, R-NFR-03)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('writes everything through one create_booking call as the acting admin', async () => {
    const { service, queries } = setup();
    expect(await service.book(bookingRequest(), ACTOR)).toEqual(RESULT);
    expect(queries.createBooking).toHaveBeenCalledTimes(1);
    const [payload, actor] = queries.createBooking.mock.calls[0] ?? [];
    expect(actor).toBe(ACTOR);
    expect(payload).toMatchObject({ student_ids: [IDS.s1, IDS.s2], rule: { package: '8' } });
  });

  it('kicks the WhatsApp sender so the confirmation goes out now (docs/12 §3.3)', async () => {
    const { service, sender } = setup();
    await service.book(bookingRequest(), ACTOR);
    expect(sender.kick).toHaveBeenCalledTimes(1);
  });

  it('the audit row travels in the same RPC, so it is written in its transaction', async () => {
    const { service, queries } = setup();
    await service.book(bookingRequest(), ACTOR);
    expect(sentAudit(queries)).toEqual({
      after: { kind: 'package', package: '8', lead_id: null, override_reason: null, conflicts: [], invoice_source: 'upload' },
    });
  });

  it('an override is audited with its reason and the conflicts it overrode', async () => {
    const { service, queries, busy } = setup();
    busy.teacherLessons.mockResolvedValue([T1]);
    await service.book(bookingRequest({ override: { reason: 'بطلب ولي الأمر' } }), ACTOR);
    expect(sentAudit(queries)?.after).toMatchObject({
      override_reason: 'بطلب ولي الأمر',
      conflicts: [{ kind: 'teacher_busy', lessonId: 'T1', startsAt: '2026-10-04T14:00:00.000Z' }],
    });
  });

  it('nothing is written when the plan is rejected, and no invoice file is resolved (copied)', async () => {
    const { service, queries, busy, invoices } = setup();
    busy.teacherLessons.mockResolvedValue([T1]);
    await expect(service.book(bookingRequest(), ACTOR)).rejects.toThrow();
    expect(queries.createBooking).not.toHaveBeenCalled();
    expect(invoices.resolve).not.toHaveBeenCalled();
  });

  it('the invoice goes into the same RPC, checked against the booked phones (R-PAY-03)', async () => {
    const { service, queries, invoices } = setup();
    const req = bookingRequest({ invoice: { source: 'upload', path: 'req/a.png' } });
    await service.book(req, ACTOR);
    expect(invoices.resolve).toHaveBeenCalledWith(req, { phones: ['+966552147730'], maxBytes: 10 * 1024 * 1024 });
    expect(queries.createBooking.mock.calls[0]?.[0]?.invoice).toEqual(INVOICE);
  });

  it('a trial stores no invoice and an audit with no source', async () => {
    const { service, queries, invoices } = setup();
    invoices.resolve.mockResolvedValue(null);
    await service.book(bookingRequest({ package: 'trial', studentIds: [IDS.s1] }), ACTOR);
    const [payload] = queries.createBooking.mock.calls[0] ?? [];
    expect(payload?.invoice).toBeNull();
    expect(payload?.audit.after).toMatchObject({ kind: 'trial', invoice_source: null });
  });

  it('a missing or bad invoice stops the booking before create_booking', async () => {
    const { service, queries, invoices, sender } = setup();
    invoices.resolve.mockRejectedValue(new Error('invoice_required'));
    await expect(service.book(bookingRequest(), ACTOR)).rejects.toThrow('invoice_required');
    expect(queries.createBooking).not.toHaveBeenCalled();
    expect(sender.kick).not.toHaveBeenCalled();
  });

  it('a trial booking evaluates its students’ status (new → trial) with the actor; a package booking does not', async () => {
    const t = setup();
    t.invoices.resolve.mockResolvedValue(null);
    await t.service.book(bookingRequest({ package: 'trial', studentIds: [IDS.s1] }), ACTOR);
    expect(t.trial.evaluate).toHaveBeenCalledWith(RESULT.student_ids, ACTOR);
    const pkg = setup();
    await pkg.service.book(bookingRequest(), ACTOR);
    expect(pkg.trial.evaluate).not.toHaveBeenCalled();
  });
});
