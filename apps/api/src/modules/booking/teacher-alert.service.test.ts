import { bookingRequestSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fakeTeacherAlert } from './teacher-alert.fakes';

const T1 = { id: 'T1', profile_id: 'P1', phone_e164: '+201001234567', tz: 'Africa/Cairo' };
const LESSONS = [{ id: 'L1', starts_at: '2026-10-04T14:00:00Z', teacher: T1 }];
const REQ = bookingRequestSchema.parse({
  teacherId: '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11', byday: [0], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45,
  startsOn: '2026-10-04', package: 'trial', studentIds: ['11111111-1111-4111-8111-111111111111'],
});
const RESULT = { rule_id: 'R1', student_ids: ['s1'], guardian_ids: [], lessons: [{ id: 'L1', starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z' }], message_ids: [], invoice_id: null };

describe('TeacherAlert.afterBooking (R-NOT-03)', () => {
  it('bell row always; WhatsApp queued when the switch is ON and the template approved; sender kicked', async () => {
    const { alert, push, queries, sender } = fakeTeacherAlert({ lessons: LESSONS });
    await alert.afterBooking({ req: REQ, result: RESULT });
    expect(push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({ kind: 'new_student', subject: 'L1', profileIds: ['P1'] }));
    expect(queries.queue).toHaveBeenCalledWith([expect.objectContaining({ template_key: 'teacher_new_student', dedup_key: 'teacher_new_student:L1:T1' })]);
    expect(queries.queue.mock.calls[0]?.[0][0]).toMatchObject({ template_params: { '3': 'تجريبية' } });
    expect(sender.kick).toHaveBeenCalledTimes(1);
  });

  it('switch OFF: the bell row only, no WhatsApp', async () => {
    const { alert, push, queries } = fakeTeacherAlert({ lessons: LESSONS, settings: { teacher_whatsapp_new_student: false } });
    await alert.afterBooking({ req: REQ, result: RESULT });
    expect(push.notifyProfiles).toHaveBeenCalledTimes(1);
    expect(queries.queue).not.toHaveBeenCalled();
  });

  it('template not approved at Meta: the bell row only, no WhatsApp', async () => {
    const { alert, push, queries } = fakeTeacherAlert({ lessons: LESSONS, approved: false });
    await alert.afterBooking({ req: REQ, result: RESULT });
    expect(push.notifyProfiles).toHaveBeenCalledTimes(1);
    expect(queries.queue).not.toHaveBeenCalled();
  });

  it('a booking without lessons does nothing but kick the sender', async () => {
    const { alert, push, queries, sender } = fakeTeacherAlert();
    await alert.afterBooking({ req: REQ, result: { ...RESULT, lessons: [] } });
    expect(queries.lessons).not.toHaveBeenCalled();
    expect(push.notifyProfiles).not.toHaveBeenCalled();
    expect(sender.kick).toHaveBeenCalledTimes(1);
  });

  it('never throws: the booking is already saved', async () => {
    const { alert, queries, sender } = fakeTeacherAlert({ lessons: LESSONS });
    queries.lessons.mockRejectedValueOnce(new Error('db down'));
    await expect(alert.afterBooking({ req: REQ, result: RESULT })).resolves.toBeUndefined();
    expect(sender.kick).toHaveBeenCalledTimes(1);
  });
});
