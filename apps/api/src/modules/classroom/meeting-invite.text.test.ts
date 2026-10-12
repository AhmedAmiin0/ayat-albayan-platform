import { describe, expect, it } from 'vitest';
import { cancelDedupKey, invitationText, inviteDedupKey, inviteSubject, resendDedupKey, whenText } from './meeting-invite.text';

describe('meeting invitation text and keys (R-MEET-02)', () => {
  it('the time in the reader tz, «الآن» for an instant meeting', () => {
    expect(whenText('2026-10-12T14:00:00Z', 'Africa/Cairo')).toContain('17:00');
    expect(whenText('2026-10-12T14:00:00Z', 'Asia/Riyadh')).toContain('17:00');
    expect(whenText('2026-10-12T14:00:00Z', 'UTC')).toContain('14:00');
    expect(whenText(null, 'UTC')).toBe('الآن');
  });

  it('the chat text carries the title, the time and the personal link (MSA, ar.json)', () => {
    const t = invitationText({ title: 'لقاء أولياء الأمور', when: 'الآن', link: 'https://app.example.test/m/x' });
    expect(t).toContain('«لقاء أولياء الأمور»');
    expect(t).toContain('الموعد: الآن');
    expect(t.endsWith('https://app.example.test/m/x')).toBe(true);
  });

  it('dedup keys: per meeting, phone/profile and time; a reschedule or a resend is a new key', () => {
    const v = { meetingId: 'm1', phone: '+201000000101', startsAt: null };
    expect(inviteDedupKey(v)).toBe('meeting_invite:m1:+201000000101:instant');
    expect(inviteDedupKey({ ...v, startsAt: '2026-10-13T08:00:00.000Z' })).not.toBe(inviteDedupKey(v));
    expect(resendDedupKey(v, 'r1')).toBe('meeting_invite:m1:+201000000101:instant:resend:r1');
    expect(inviteSubject('m1', null)).toBe('m1:instant');
    expect(cancelDedupKey('m1', '+201000000101')).toBe('meeting_cancel:m1:+201000000101');
  });
});
