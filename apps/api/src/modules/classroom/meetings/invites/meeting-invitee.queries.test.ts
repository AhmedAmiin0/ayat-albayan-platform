import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../guardians/fake-db';
import { MeetingInviteeQueries } from './meeting-invitee.queries';

describe('MeetingInviteeQueries.teacherStudentIds (owner 2026-10-15)', () => {
  it('the teacher’s own students, never the not-subscribed ones (new, trial, pending_subscription)', async () => {
    const f = fakeDb({ teachers: [{ data: { id: 't1' } }], students: [{ data: [{ id: 's1' }] }] });
    expect(await new MeetingInviteeQueries(f.db).teacherStudentIds('p1')).toEqual(['s1']);
    expect(f.argsOf('students', 'eq')).toEqual(['teacher_id', 't1']);
    expect(f.argsOf('students', 'not')).toEqual(['status', 'in', '(new,trial,pending_subscription)']);
  });

  it('no teacher row → no students read', async () => {
    const f = fakeDb({ teachers: [{ data: null }] });
    expect(await new MeetingInviteeQueries(f.db).teacherStudentIds('p1')).toEqual([]);
    expect(f.calls.some((c) => c.table === 'students')).toBe(false);
  });
});
