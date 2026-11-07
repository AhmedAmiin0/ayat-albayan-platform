import { bookingRequestSchema } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { fakeTeacherAlert } from './teacher-alert.fakes';
import { TeacherAlertRepo } from './teacher-alert.repo';

// Owner 2026-11-02 «Message not sent to the teacher»: on a crm line teacher_new_student goes as the
// CRM's teacher_lesson_v2, so the queue gate reads that template's status (template-gate.repo.ts).

const T1 = { id: 'T1', profile_id: 'P1', phone_e164: '+201001234567', tz: 'Africa/Cairo', display_name_ar: 'أ. خالد' };
const LESSONS = [{ id: 'L1', starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z', teacher: T1 }];
const STUDENTS = [{ id: 's1', name: 'سهيلة', code: 'AB-0101' }];
const REQ = bookingRequestSchema.parse({
  teacherId: '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11', byday: [0], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45,
  startsOn: '2026-10-04', package: 'trial', studentIds: ['11111111-1111-4111-8111-111111111111'],
});
const RESULT = { rule_id: 'R1', student_ids: ['s1'], guardian_ids: [], lessons: [{ id: 'L1', starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z' }], message_ids: [], invoice_id: null };

const OWN = templateRow({ key: 'teacher_new_student', meta_name: 'teacher_new_student', status: 'not_submitted' });
const V2 = templateRow({ key: 'teacher_lesson_v2', meta_name: 'teacher_lesson_v2', status: 'approved' });

/** A real TeacherAlertRepo.sendable() over these message_templates rows; the other reads faked. */
function alertOver(rows: unknown[], settings: { teacher_whatsapp_new_student?: boolean } = {}) {
  const { db, calls } = fakeDb({ message_templates: [{ data: rows }] });
  const fake = fakeTeacherAlert({ lessons: LESSONS, settings });
  fake.queries.students.mockImplementation(async () => STUDENTS);
  const repo = new TeacherAlertRepo(db, {} as never);
  fake.queries.sendable.mockImplementation(() => repo.sendable());
  return { ...fake, calls };
}

afterEach(() => vi.unstubAllEnvs());

describe('TeacherAlert: the approval gate by the line\'s driver', () => {
  it('crm line, teacher_lesson_v2 approved, teacher_new_student not_submitted: one row, with its crm values', async () => {
    vi.stubEnv('WA_PROVIDER', 'crm');
    const { alert, queries, calls } = alertOver([OWN, V2]);
    await alert.afterBooking({ req: REQ, result: RESULT });
    // The read does not filter teacher_new_student by its own status (the bug): the gate decides.
    const reads = calls.filter((c) => c.table === 'message_templates');
    expect(reads.find((c) => c.method === 'or')?.args).toEqual(['status.eq.approved,key.in.(teacher_new_student)']);
    expect(reads.some((c) => c.method === 'eq')).toBe(false);
    expect(queries.queue).toHaveBeenCalledTimes(1);
    const rows = queries.queue.mock.calls[0]?.[0] ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      template_key: 'teacher_new_student',
      dedup_key: 'teacher_new_student:L1:T1',
      template_params: { crm: { body: ['أ. خالد', 'سهيلة (AB-0101)', expect.any(String), '45 دقيقة'] } },
    });
  });

  it('crm line, teacher_lesson_v2 not approved: nothing queued', async () => {
    vi.stubEnv('WA_PROVIDER', 'crm');
    const { alert, queries } = alertOver([OWN, { ...V2, status: 'missing' }]);
    await alert.afterBooking({ req: REQ, result: RESULT });
    expect(queries.queue).not.toHaveBeenCalled();
  });

  it('meta line, teacher_new_student not approved: nothing queued, whatever teacher_lesson_v2 says', async () => {
    vi.stubEnv('WA_PROVIDER', 'meta');
    const { alert, queries, push } = alertOver([OWN, V2]);
    await alert.afterBooking({ req: REQ, result: RESULT });
    expect(push.notifyProfiles).toHaveBeenCalledTimes(1);
    expect(queries.queue).not.toHaveBeenCalled();
  });

  it('meta line, teacher_new_student approved: queued as before', async () => {
    vi.stubEnv('WA_PROVIDER', 'meta');
    const { alert, queries } = alertOver([{ ...OWN, status: 'approved' }]);
    await alert.afterBooking({ req: REQ, result: RESULT });
    expect(queries.queue).toHaveBeenCalledTimes(1);
  });

  it('rule OFF: nothing queued and no template read, even on a crm line with v2 approved', async () => {
    vi.stubEnv('WA_PROVIDER', 'crm');
    const { alert, queries, calls } = alertOver([OWN, V2], { teacher_whatsapp_new_student: false });
    await alert.afterBooking({ req: REQ, result: RESULT });
    expect(queries.queue).not.toHaveBeenCalled();
    expect(calls.filter((c) => c.table === 'message_templates')).toEqual([]);
  });
});
