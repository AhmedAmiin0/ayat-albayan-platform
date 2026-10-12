import { describe, expect, it } from 'vitest';
import { teacherAlerts, type AlertLesson } from './teacher-alert.plan';

const NOW = new Date('2026-10-01T08:00:00Z');
const T1 = { id: 'T1', profile_id: 'P1', phone_e164: '+201001234567', tz: 'Africa/Cairo' };
const T2 = { id: 'T2', profile_id: null, phone_e164: '+966552147730', tz: 'Asia/Riyadh' };
const lesson = (id: string, startsAt: string, teacher: AlertLesson['teacher']): AlertLesson => ({ id, starts_at: startsAt, teacher });
const STUDENTS = [{ id: 's1', name: 'سهيلة' }, { id: 's2', name: 'مريم' }];

describe('teacherAlerts (R-NOT-03)', () => {
  it('one alert per distinct teacher, about their FIRST lesson of the booking, in their tz', () => {
    const lessons = [lesson('L2', '2026-10-06T14:00:00Z', T1), lesson('L1', '2026-10-04T14:00:00Z', T1)];
    const [plan, ...rest] = teacherAlerts({ lessons, students: STUDENTS, kind: 'package', now: NOW });
    expect(rest).toEqual([]);
    expect(plan?.push).toEqual({
      kind: 'new_student',
      subject: 'L1',
      vars: { student: 'سهيلة ومريم', when: expect.stringContaining('17:00') },
      data: { lessonId: 'L1', studentId: 's1' },
      profileIds: ['P1'],
    });
    expect(plan?.message).toMatchObject({
      phone_e164: '+201001234567',
      lesson_id: 'L1',
      guardian_id: null,
      template_key: 'teacher_new_student',
      template_params: { '1': 'سهيلة ومريم', '2': expect.stringContaining('17:00'), '3': 'اشتراك' },
      dedup_key: 'teacher_new_student:L1:T1',
      expires_at: '2026-10-04T14:00:00.000Z',
    });
  });

  it('a trial reads «تجريبية»; two teachers get two alerts', () => {
    const lessons = [lesson('L1', '2026-10-04T14:00:00Z', T1), lesson('L9', '2026-10-05T14:00:00Z', T2)];
    const plans = teacherAlerts({ lessons, students: STUDENTS.slice(0, 1), kind: 'trial', now: NOW });
    expect(plans.map((p) => p.message?.dedup_key)).toEqual(['teacher_new_student:L1:T1', 'teacher_new_student:L9:T2']);
    expect(plans[1]?.message?.template_params['3']).toBe('تجريبية');
    expect(plans[1]?.message?.template_params['2']).toContain('17:00');
  });

  it('no login = no bell row; no phone = no WhatsApp row; no teacher = nothing', () => {
    const noPhone = { ...T1, phone_e164: null };
    const plans = teacherAlerts({ lessons: [lesson('L1', '2026-10-04T14:00:00Z', T2), lesson('L2', '2026-10-04T15:00:00Z', noPhone), lesson('L3', '2026-10-04T16:00:00Z', null)], students: STUDENTS, kind: 'makeup', now: NOW });
    expect(plans).toHaveLength(2);
    expect(plans[0]).toMatchObject({ push: null, message: expect.objectContaining({ phone_e164: '+966552147730' }) });
    expect(plans[1]).toMatchObject({ push: expect.objectContaining({ profileIds: ['P1'] }), message: null });
  });
});
