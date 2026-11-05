import { describe, expect, it } from 'vitest';
import { courseNoticeData } from './course-notice.js';
import { webNotificationPath } from './web-path.js';

const ID = '11111111-1111-4111-8111-111111111111';
const PHONE = '+966500000000';
const paid = (phone: string | null) => ({ kind: 'payment_received', ...courseNoticeData(ID, phone) });

describe('«احجز أيام الحلقات» notices (owner 2026-11-06)', () => {
  it('data: the student, open course, the phone only when known', () => {
    expect(courseNoticeData(ID, PHONE)).toEqual({ studentId: ID, open: 'course', phone: PHONE });
    expect(courseNoticeData(ID, null)).toEqual({ studentId: ID, open: 'course' });
  });

  it('sales: the family chat with the course wizard open', () => {
    expect(webNotificationPath(paid(PHONE), 'sales')).toBe(`/sales/inbox?phone=%2B966500000000&course=${ID}`);
    expect(webNotificationPath({ kind: 'payment_due', ...courseNoticeData(ID, PHONE) }, 'sales')).toContain('course=');
  });

  it('no phone, or an admin: the student as the kind opens it', () => {
    expect(webNotificationPath(paid(null), 'sales')).toBe('/sales/students');
    expect(webNotificationPath(paid(PHONE), 'admin')).toBe(`/admin/students/${ID}`);
  });

  it('an unknown kind stays home', () => {
    expect(webNotificationPath({ kind: 'nope', open: 'course' }, 'sales')).not.toContain('course=');
  });
});
