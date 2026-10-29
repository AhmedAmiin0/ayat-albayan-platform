import { describe, expect, it } from 'vitest';
import { PUSH_KINDS } from '../enums/index.js';
import { notificationKind, webNotificationPath } from './web-path.js';

const STUDENT = '3f1c2a5e-8b7d-4c1e-9a2b-1d2e3f4a5b6c';
const MEETING = '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d';
const PHONE = '+966500000001';

describe('webNotificationPath (R-NOT-01)', () => {
  it('admin kinds open the inbox thread, the dashboard or the student', () => {
    expect(webNotificationPath({ kind: 'new_lead', phone: PHONE }, 'admin')).toBe('/admin/inbox?phone=%2B966500000001');
    expect(webNotificationPath({ kind: 'new_message', phone: PHONE }, 'admin')).toBe('/admin/inbox?phone=%2B966500000001');
    expect(webNotificationPath({ kind: 'reminder_failed', phone: PHONE }, 'admin')).toBe('/admin/inbox?phone=%2B966500000001');
    expect(webNotificationPath({ kind: 'lesson_needs_confirmation', lessonId: STUDENT }, 'admin')).toBe('/admin');
    expect(webNotificationPath({ kind: 'report_submitted', studentId: STUDENT }, 'admin')).toBe(`/admin/students/${STUDENT}`);
    expect(webNotificationPath({ kind: 'payment_due', studentId: STUDENT }, 'admin')).toBe(`/admin/students/${STUDENT}`);
  });

  it('new_student: the teacher calendar for teachers, the student for admins', () => {
    const data = { kind: 'new_student', studentId: STUDENT, lessonId: MEETING };
    expect(webNotificationPath(data, 'teacher')).toBe('/teacher/calendar');
    expect(webNotificationPath(data, 'admin')).toBe(`/admin/students/${STUDENT}`);
    expect(webNotificationPath(data, 'sales')).toBe('/sales/students');
  });

  it('meeting_invite: the meeting room, or each portal’s meetings list without a valid id', () => {
    expect(webNotificationPath({ kind: 'meeting_invite', meetingId: MEETING }, 'sales')).toBe(`/meeting/${MEETING}`);
    expect(webNotificationPath({ kind: 'meeting_invite', meetingId: '../x' }, 'admin')).toBe('/admin/classrooms');
    expect(webNotificationPath({ kind: 'meeting_invite' }, 'teacher')).toBe('/teacher');
    expect(webNotificationPath({ kind: 'meeting_invite' }, 'sales')).toBe('/sales/meetings');
    expect(webNotificationPath({ kind: 'meeting_invite' }, 'assistant')).toBe('/assistant');
  });

  it('channel_message: the teacher’s «رسائل الطلاب» on that student (docs/31 §2), home for anyone else', () => {
    const id = 'a1b2c3d4-0000-4000-8000-000000000001';
    expect(webNotificationPath({ kind: 'channel_message', studentId: id }, 'teacher')).toBe(`/teacher/messages?student=${id}`);
    expect(webNotificationPath({ kind: 'channel_message' }, 'teacher')).toBe('/teacher/messages');
    expect(webNotificationPath({ kind: 'channel_message', studentId: id }, 'admin')).toBe('/admin');
  });

  it('commission_earned: «محفظتي» for sales (owner 2026-10-29), home for anyone else', () => {
    expect(webNotificationPath({ kind: 'commission_earned', commissionId: STUDENT }, 'sales')).toBe('/sales/earnings');
    expect(webNotificationPath({ kind: 'commission_earned' }, 'admin')).toBe('/admin');
    expect(webNotificationPath({ kind: 'commission_earned' }, 'teacher')).toBe('/teacher');
    expect(webNotificationPath({ kind: 'commission_earned' }, 'assistant')).toBe('/assistant');
  });

  it('google_sync_alert: «مزامنة Google» for admins (docs/26b §1), home for anyone else', () => {
    expect(webNotificationPath({ kind: 'google_sync_alert' }, 'admin')).toBe('/admin/settings/google');
    expect(webNotificationPath({ kind: 'google_sync_alert' }, 'teacher')).toBe('/teacher');
  });

  it('each portal keeps to its own pages', () => {
    expect(webNotificationPath({ kind: 'new_message', phone: PHONE }, 'teacher')).toBe('/teacher/inbox?phone=%2B966500000001');
    expect(webNotificationPath({ kind: 'new_message', phone: PHONE }, 'sales')).toBe('/sales/inbox?phone=%2B966500000001');
    expect(webNotificationPath({ kind: 'new_message', phone: PHONE }, 'assistant')).toBe('/assistant');
    expect(webNotificationPath({ kind: 'lesson_needs_confirmation' }, 'teacher')).toBe('/teacher');
    expect(webNotificationPath({ kind: 'payment_due', studentId: STUDENT }, 'teacher')).toBe('/teacher/students');
  });

  it('falls back safely on a bad phone, a bad id, an unknown kind or a non-staff role', () => {
    expect(webNotificationPath({ kind: 'new_lead', phone: 'javascript:alert(1)' }, 'admin')).toBe('/admin/inbox');
    expect(webNotificationPath({ kind: 'report_submitted', studentId: '../../x' }, 'admin')).toBe('/admin/students');
    expect(webNotificationPath({ kind: 'nope' }, 'admin')).toBe('/admin');
    expect(webNotificationPath(null, 'teacher')).toBe('/teacher');
    expect(webNotificationPath({ kind: 'new_lead', phone: PHONE }, 'guardian')).toBe('/portal');
    expect(webNotificationPath({ kind: 'new_lead' }, null)).toBe('/');
  });

  it('every kind maps to a same-origin path for every staff role', () => {
    for (const kind of PUSH_KINDS) {
      for (const role of ['admin', 'teacher', 'sales', 'assistant'] as const) {
        expect(webNotificationPath({ kind }, role)).toMatch(/^\/[a-z]/);
      }
    }
    expect(notificationKind({ kind: 'new_student' })).toBe('new_student');
    expect(notificationKind({ kind: 7 })).toBeNull();
  });
});
