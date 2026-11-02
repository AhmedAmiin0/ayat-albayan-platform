import { describe, expect, it } from 'vitest';
import { STUDENT_STATUSES } from '@ab/catalog';
import { channelOpen, familyChats } from './channel.js';

// Owner 2026-10-29: the chat opens once the student subscribed AND the assistant assigned the teacher;
// the guardian chats for a child, the student only when they are their own contact.
describe('channelOpen (migration 971 channel_is_open)', () => {
  it('never at registration or during the trial, even with the trial teacher assigned', () => {
    for (const status of ['new', 'trial', 'pending_subscription']) expect(channelOpen({ status, teacher_id: 't1' })).toBe(false);
  });

  it('open once subscribed with a teacher; closed without one', () => {
    const after = STUDENT_STATUSES.filter((s) => !['new', 'trial', 'pending_subscription'].includes(s));
    expect(after).toContain('active');
    for (const status of after) {
      expect(channelOpen({ status, teacher_id: 't1' })).toBe(true);
      expect(channelOpen({ status, teacher_id: null })).toBe(false);
    }
  });
});

describe('familyChats', () => {
  it('the guardian always; a student login only when their own contact', () => {
    expect(familyChats({ kind: 'guardian', contactIsSelf: false })).toBe(true);
    expect(familyChats({ kind: 'student', contactIsSelf: true })).toBe(true);
    expect(familyChats({ kind: 'student', contactIsSelf: false })).toBe(false);
  });
});
