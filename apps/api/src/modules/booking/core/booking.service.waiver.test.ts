import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingRequest, fakePlanner, NOW } from '../booking.fakes';
import type { BookingInvoices } from '../invoice/booking.invoice';
import { code, SCOPE, setup as invoiceSetup } from '../invoice/booking.invoice.fakes';
import type { BookingQueries } from './booking.queries';
import { BookingService } from './booking.service';
import { BookingWriter } from './booking.writer';
import { fakeTeacherAlert } from '../teacher/teacher-alert.fakes';

// The invoice waiver is a server-side option only (the assistant's course, owner 2026-10-18 decision 2):
// the request body has no way to ask for it, so the admin's POST /booking still needs an invoice.

const ACTOR = 'a0000000-0000-4000-8000-000000000001';
const RESULT = { rule_id: 'R1', student_ids: [], guardian_ids: [], lessons: [], message_ids: [], invoice_id: null };

function setup() {
  const deps = fakePlanner();
  deps.queries.createBooking.mockResolvedValue(RESULT);
  const { invoices } = invoiceSetup();
  const resolve = vi.spyOn(invoices, 'resolve');
  const writer = new BookingWriter(deps.queries as unknown as BookingQueries, invoices as BookingInvoices, fakeTeacherAlert().after);
  return { ...deps, resolve, service: new BookingService(deps.planner, writer, deps.queries as unknown as BookingQueries) };
}

describe('BookingService.book — invoiceWaived (R-PAY-03, R-ASST-04)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('without the option a package with no invoice is 400 invoice_required; nothing is written', async () => {
    const { service, queries } = setup();
    expect(await code(service.book(bookingRequest({ invoice: undefined }), ACTOR))).toEqual({ status: 400, code: 'invoice_required' });
    expect(queries.createBooking).not.toHaveBeenCalled();
  });

  it('with invoiceWaived the package is written with no invoice and an audit with no source', async () => {
    const { service, queries, resolve } = setup();
    await service.book(bookingRequest({ invoice: undefined }), ACTOR, { invoiceWaived: true });
    expect(resolve).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ waived: true }));
    const [payload, actor] = queries.createBooking.mock.calls[0] ?? [];
    expect(actor).toBe(ACTOR);
    expect(payload?.invoice).toBeNull();
    expect(payload?.audit.after).toMatchObject({ kind: 'package', invoice_source: null });
  });

  it('endsOn travels to every rule of the payload', async () => {
    const { service, queries } = setup();
    const req = bookingRequest({ invoice: undefined, startsOn: '2026-10-04' });
    await service.book(req, ACTOR, { invoiceWaived: true, endsOn: '2026-10-18' });
    const [payload] = queries.createBooking.mock.calls[0] ?? [];
    expect(payload?.rule.ends_on).toBe('2026-10-18');
    expect(payload?.lessons).toHaveLength(3);
  });

  it('BookingInvoices.resolve: waived → null with no invoice; not waived → 400 as before', async () => {
    const { invoices, storage } = invoiceSetup();
    const req = bookingRequest({ invoice: undefined });
    expect(await invoices.resolve(req, { ...SCOPE, waived: true })).toBeNull();
    expect(await code(invoices.resolve(req, { ...SCOPE, waived: false }))).toEqual({ status: 400, code: 'invoice_required' });
    expect(storage.info).not.toHaveBeenCalled();
  });
});
