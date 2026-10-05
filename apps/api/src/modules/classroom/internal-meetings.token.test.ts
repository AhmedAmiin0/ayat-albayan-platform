import { describe, expect, it } from 'vitest';
import { ADMIN, ASSISTANT, GUARDIAN, OTHER_TEACHER, SALES, TEACHER } from './classroom.fakes';
import { meetingRow } from './internal-meetings.fakes';
import { canManageMeeting, hashMeetingToken, looksLikeMeetingToken, meetingRoleOf, newMeetingToken, roleOfIdentity } from './internal-meetings.token';

describe('meeting link token', () => {
  it('is 32 random bytes as 43 base64url characters, stored as a sha256 hex hash', () => {
    const token = newMeetingToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(looksLikeMeetingToken(token)).toBe(true);
    expect(newMeetingToken()).not.toBe(token);
    expect(hashMeetingToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashMeetingToken(token)).toBe(hashMeetingToken(token));
    expect(hashMeetingToken(token)).not.toBe(token);
  });

  it('uses the injected bytes', () => {
    expect(newMeetingToken((n) => Buffer.alloc(n, 0))).toBe('A'.repeat(43));
  });

  it('rejects anything of another shape before any lookup', () => {
    expect(looksLikeMeetingToken('short')).toBe(false);
    expect(looksLikeMeetingToken('a'.repeat(32))).toBe(false);
    expect(looksLikeMeetingToken(`${'a'.repeat(42)}!`)).toBe(false);
  });
});

describe('meeting roles', () => {
  const mine = meetingRow({ created_by: TEACHER.id });

  it('admin stays admin, the creator hosts as teacher, other staff keep their role', () => {
    expect(meetingRoleOf(ADMIN, mine)).toBe('admin');
    expect(meetingRoleOf(TEACHER, mine)).toBe('teacher');
    expect(meetingRoleOf(OTHER_TEACHER, mine)).toBe('teacher');
    expect(meetingRoleOf(ASSISTANT, mine)).toBe('assistant');
    expect(meetingRoleOf(SALES, mine)).toBe('sales');
    expect(meetingRoleOf(ASSISTANT, meetingRow({ created_by: ASSISTANT.id }))).toBe('teacher');
  });

  it('refuses a guardian login and never treats a null creator as a match', () => {
    expect(meetingRoleOf(GUARDIAN, mine)).toBeNull();
    expect(meetingRoleOf({ id: 'x', role: null }, meetingRow({ created_by: null }))).toBeNull();
  });

  it('only the creator or an admin manages it', () => {
    expect(canManageMeeting(ADMIN, mine)).toBe(true);
    expect(canManageMeeting(TEACHER, mine)).toBe(true);
    expect(canManageMeeting(OTHER_TEACHER, mine)).toBe(false);
    expect(canManageMeeting(SALES, meetingRow({ created_by: null }))).toBe(false);
  });

  it('reads the role out of a minted identity', () => {
    expect(roleOfIdentity('guest-0123456789ab')).toBe('guest');
    expect(roleOfIdentity('admin-0123456789ab')).toBe('admin');
    expect(roleOfIdentity('boss-0123456789ab')).toBeNull();
    expect(roleOfIdentity('guest-xyz')).toBeNull();
  });
});
