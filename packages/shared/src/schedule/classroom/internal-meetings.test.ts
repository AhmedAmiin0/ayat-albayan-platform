import { describe, expect, it } from 'vitest';
import { createMeetingSchema, meetingState } from './internal-meetings.js';
import { meetingRoomName } from './room.js';

const NOW = new Date('2026-10-05T10:00:00Z');

describe('internal meetings', () => {
  it('meetingRoomName is meeting-<id>', () => {
    expect(meetingRoomName('abc')).toBe('meeting-abc');
  });

  it('createMeetingSchema: optional title, trimmed, 1 to 60 characters', () => {
    expect(createMeetingSchema.parse({})).toEqual({});
    expect(createMeetingSchema.parse({ title: '  اجتماع الإدارة ' }).title).toBe('اجتماع الإدارة');
    expect(createMeetingSchema.safeParse({ title: '  ' }).success).toBe(false);
    expect(createMeetingSchema.safeParse({ title: 'x'.repeat(61) }).success).toBe(false);
  });

  it('meetingState: open until ended or revoked', () => {
    expect(meetingState({ ends_at: null, revoked: false }, NOW)).toBe('open');
    expect(meetingState({ ends_at: '2026-10-05T09:59:00Z', revoked: false }, NOW)).toBe('ended');
    expect(meetingState({ ends_at: '2026-10-05T11:00:00Z', revoked: false }, NOW)).toBe('open');
    expect(meetingState({ ends_at: null, revoked: true }, NOW)).toBe('ended');
  });
});
