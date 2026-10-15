import type { BookingRequest } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { bookingRequest, leadRequest } from './booking.fakes';
import { clientRequest } from './booking.payload';

const statusOf = (req: BookingRequest) => ('newStudent' in req ? req.newStudent.status : undefined);
const student = { name: 'رِيم', tz: 'Asia/Riyadh' };
const onPackage = (status: string) => leadRequest({ package: '8', invoice: { source: 'upload', path: 'r/a.png' }, newStudent: { ...student, status } });

describe('clientRequest: a lead booked onto a package starts new (docs/18 row 1, owner 2026-10-15)', () => {
  it.each(['sales', 'assistant', 'teacher', null])('%s: an explicit active becomes new on a package', (role) => {
    expect(statusOf(clientRequest(onPackage('active'), role))).toBe('new');
  });

  it('a non-admin trial booking with active becomes trial', () => {
    const req = leadRequest({ newStudent: { ...student, status: 'active' } });
    expect(statusOf(clientRequest(req, 'sales'))).toBe('trial');
  });

  it('an admin may still register a student as active', () => {
    const req = onPackage('active');
    expect(clientRequest(req, 'admin')).toBe(req);
  });

  it.each(['paused', 'churned', 'pending_renewal', 'expired', 'new'])('a non-admin %s on a package becomes new', (status) => {
    expect(statusOf(clientRequest(onPackage(status), 'sales'))).toBe('new');
  });

  it('a non-admin churned on a trial becomes trial; no new student is left as sent', () => {
    expect(statusOf(clientRequest(leadRequest({ newStudent: { ...student, status: 'churned' } }), 'sales'))).toBe('trial');
    const existing = bookingRequest();
    expect(clientRequest(existing, 'sales')).toBe(existing);
  });
});
