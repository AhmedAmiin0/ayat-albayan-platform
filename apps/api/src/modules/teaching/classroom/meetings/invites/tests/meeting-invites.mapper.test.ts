import { InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { STAFF_ID, STUDENT_A, stored } from '@/modules/teaching/classroom/meetings/invites/meeting-invites.fakes';
import { toInviteeOptions, toInviteeView } from '@/modules/teaching/classroom/meetings/invites/meeting-invites.mapper';

const staff = { id: STAFF_ID, full_name: 'مريم', role: 'teacher' };
const FIELDS = { meeting_id: STAFF_ID, display_name: 'مريم' };
const student = { id: STUDENT_A, name: 'ليلى', code: null };

describe('meeting invite mappers', () => {
  it('lists staff then students, a student without a code with an empty one', () => {
    expect(toInviteeOptions({ staff: [staff], students: [student] })).toEqual([
      { kind: 'staff', id: STAFF_ID, name: 'مريم', role: 'teacher' },
      { kind: 'student', id: STUDENT_A, name: 'ليلى', code: '' },
    ]);
  });

  it('500 response_invalid for an option whose id is not a uuid', () => {
    const bad = { staff: [], students: [{ ...student, id: 'x' }] };
    expect(() => toInviteeOptions(bad)).toThrow(InternalServerErrorException);
  });

  it('keeps an unknown invitee kind, channel or status on its fallback', () => {
    const row = stored({ ...FIELDS, kind: 'robot', channel: 'fax', status: 'lost' });
    expect(toInviteeView(row)).toMatchObject({ kind: 'phone', channel: 'link', status: 'pending' });
  });
});
