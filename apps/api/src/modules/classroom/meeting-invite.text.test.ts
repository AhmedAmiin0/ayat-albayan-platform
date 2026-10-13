import { describe, expect, it } from 'vitest';
import { cancelDedupKey, invitationText, inviteDedupKey, inviteeWhen, inviteSubject, resendDedupKey, whenKey, whenText } from './meeting-invite.text';

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

describe('whenKey and inviteeWhen (R-MEET-02 review 2026-10-13)', () => {
  it('a PostgREST "+00:00" start keys the same instant as its ISO form', () => {
    expect(whenKey('2026-10-05T12:00:00+00:00')).toBe('2026-10-05T12:00:00.000Z');
    expect(inviteSubject('m1', '2026-10-05T12:00:00+00:00')).toBe(inviteSubject('m1', '2026-10-05T12:00:00.000Z'));
  });

  it('an unknown typed number names the tz used; a known family or an instant meeting does not', () => {
    const unknown = { kind: 'phone', tz: 'Africa/Cairo', display_name: '+201000000101', phone_e164: '+201000000101' };
    expect(inviteeWhen('2026-10-12T14:00:00Z', unknown)).toContain('(بتوقيت القاهرة)');
    expect(inviteeWhen('2026-10-12T14:00:00Z', { ...unknown, tz: 'Etc/GMT-3' })).toContain('Etc/GMT-3');
    expect(inviteeWhen('2026-10-12T14:00:00Z', { ...unknown, display_name: 'أم سهيلة' })).not.toContain('بتوقيت');
    expect(inviteeWhen('2026-10-12T14:00:00Z', { ...unknown, kind: 'student' })).not.toContain('بتوقيت');
    expect(inviteeWhen(null, unknown)).toBe('الآن');
  });
});
