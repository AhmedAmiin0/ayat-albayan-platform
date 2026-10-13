import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { meetingErrorText } from './meeting-invites-api';

describe('meetingErrorText', () => {
  it('reads each known code in words, else the generic line', () => {
    expect(meetingErrorText(new ApiError(400, { code: 'too_far_ahead' }))).toBe(t.meetingInvites.errors.too_far_ahead);
    expect(meetingErrorText(new ApiError(409, { code: 'invite_limit' }))).toBe(t.meetingInvites.errors.invite_limit);
    expect(meetingErrorText(new ApiError(404, { code: 'student_not_found' }))).toBe(t.meetingInvites.errors.student_not_found);
    expect(meetingErrorText(new ApiError(403, { code: 'phone_invite_not_allowed' }))).toBe(t.meetingInvites.errors.phone_invite_not_allowed);
    expect(meetingErrorText(new ApiError(409, { code: 'meeting_not_started' }))).toBe(t.meetingInvites.errors.meeting_not_started);
    expect(meetingErrorText(new ApiError(410, { code: 'meeting_ended' }))).toBe(t.classroom.error.meeting_ended);
    expect(meetingErrorText(new ApiError(400, { code: 'not_scheduled' }))).toBe(t.meetingInvites.error);
    expect(meetingErrorText(new Error('offline'))).toBe(t.meetingInvites.error);
    expect(meetingErrorText(new Error('offline'), 'x')).toBe('x');
  });
});
