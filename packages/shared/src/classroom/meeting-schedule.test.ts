import { describe, expect, it } from 'vitest';
import { canJoinMeeting, createMeetingSchema, meetingState, meetingWindow, plannedEnd, scheduleProblem } from './internal-meetings.js';
import { addMeetingInviteesSchema, meetingInviteeInputSchema, updateMeetingSchema } from './meeting-invites.js';

const NOW = new Date('2026-10-12T10:00:00Z');
const UUID = '00000000-0000-4000-8000-000000000001';
const scheduled = { ends_at: null, revoked: false, starts_at: '2026-10-12T12:00:00Z', planned_end_at: '2026-10-12T13:00:00Z' };
const at = (iso: string) => new Date(iso);

describe('scheduled meetings (R-MEET-01)', () => {
  it('createMeetingSchema: schedule, duration 15..240 and up to 30 invitees', () => {
    const ok = createMeetingSchema.parse({ startsAt: '2026-10-13T08:00:00Z', durationMin: 45, invitees: [{ kind: 'staff', profileId: UUID }] });
    expect(ok.durationMin).toBe(45);
    expect(createMeetingSchema.safeParse({ durationMin: 10 }).success).toBe(false);
    expect(createMeetingSchema.safeParse({ durationMin: 241 }).success).toBe(false);
    expect(createMeetingSchema.safeParse({ startsAt: '13/10 08:00' }).success).toBe(false);
    const many = Array.from({ length: 31 }, () => ({ kind: 'phone', phone: '+201000000101' }));
    expect(createMeetingSchema.safeParse({ invitees: many }).success).toBe(false);
  });

  it('invitee input is one of staff / student / phone', () => {
    expect(meetingInviteeInputSchema.safeParse({ kind: 'student', studentId: UUID }).success).toBe(true);
    expect(meetingInviteeInputSchema.safeParse({ kind: 'student', profileId: UUID }).success).toBe(false);
    expect(meetingInviteeInputSchema.safeParse({ kind: 'guardian', phone: '+201000000101' }).success).toBe(false);
    expect(addMeetingInviteesSchema.safeParse({ invitees: [] }).success).toBe(false);
  });

  it('updateMeetingSchema needs at least one field', () => {
    expect(updateMeetingSchema.safeParse({}).success).toBe(false);
    expect(updateMeetingSchema.safeParse({ title: 'x' }).success).toBe(true);
  });

  it('scheduleProblem: future only, at most 90 days ahead', () => {
    expect(scheduleProblem('2026-10-12T09:59:00Z', NOW, 90)).toBe('starts_in_past');
    expect(scheduleProblem('2026-10-12T10:00:00Z', NOW, 90)).toBe('starts_in_past');
    expect(scheduleProblem('2027-01-10T10:00:00Z', NOW, 90)).toBe(null);
    expect(scheduleProblem('2027-01-10T10:01:00Z', NOW, 90)).toBe('too_far_ahead');
  });

  it('plannedEnd adds the duration', () => {
    expect(plannedEnd('2026-10-12T12:00:00Z', 45)).toBe('2026-10-12T12:45:00.000Z');
  });

  it('an instant meeting has no window and is joinable until ended', () => {
    const instant = { ends_at: null, revoked: false, starts_at: null, planned_end_at: null };
    expect(meetingWindow(instant, NOW)).toBeNull();
    expect(canJoinMeeting(instant, NOW)).toBe(true);
    expect(canJoinMeeting({ ...instant, ends_at: '2026-10-12T09:00:00Z' }, NOW)).toBe(false);
  });

  it('a scheduled meeting opens 15 min before and closes 120 min after its planned end', () => {
    expect(meetingWindow(scheduled, NOW)?.state).toBe('early');
    expect(canJoinMeeting(scheduled, at('2026-10-12T11:44:00Z'))).toBe(false);
    expect(canJoinMeeting(scheduled, at('2026-10-12T11:45:00Z'))).toBe(true);
    expect(canJoinMeeting(scheduled, at('2026-10-12T15:00:00Z'))).toBe(true);
    expect(meetingState(scheduled, at('2026-10-12T15:01:00Z'))).toBe('ended');
    expect(meetingState(scheduled, NOW)).toBe('open');
  });

  it('cancelled means ended for everyone', () => {
    const cancelled = { ...scheduled, cancelled_at: '2026-10-12T09:00:00Z' };
    expect(meetingState(cancelled, at('2026-10-12T12:00:00Z'))).toBe('ended');
    expect(canJoinMeeting(cancelled, at('2026-10-12T12:00:00Z'))).toBe(false);
  });
});
