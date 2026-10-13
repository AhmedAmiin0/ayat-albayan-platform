import { describe, expect, it } from 'vitest';
import { copyPayload, inviteStatusText, notSentHint } from './invite-status';
import { addInvitee, fromOption, fromPhone, hasInvitee, isFull, removeInvitee, type PickedInvitee } from './invitee-list';
import { t } from '@/lib/i18n';

const R = t.meetingInvites.results;
const student = fromOption({ kind: 'student', id: 'st-1', name: 'سهيلة', code: 'AB-0101' });

describe('invitee-list', () => {
  it('maps a search result and a typed phone (E.164 only) to chips', () => {
    expect(student).toEqual({ key: 'student:st-1', name: 'سهيلة', input: { kind: 'student', studentId: 'st-1' } });
    expect(fromPhone('+20 100 000 0101')).toEqual({ key: 'phone:+201000000101', name: '+201000000101', input: { kind: 'phone', phone: '+201000000101' } });
    expect(fromPhone('12')).toBeNull();
    expect(fromPhone('')).toBeNull();
  });

  it('adds each invitee once, removes by key and stops at 30', () => {
    const one = addInvitee([], student);
    expect(addInvitee(one, student)).toHaveLength(1);
    expect(hasInvitee(one, 'student:st-1')).toBe(true);
    expect(removeInvitee(one, 'student:st-1')).toEqual([]);
    const many: PickedInvitee[] = Array.from({ length: 30 }, (_, i) => fromOption({ kind: 'staff', id: `s-${i}`, name: `م${i}`, role: 'teacher' }));
    expect(isFull(many)).toBe(true);
    expect(addInvitee(many, student)).toHaveLength(30);
  });
});

describe('invite-status', () => {
  it('says how each recipient went', () => {
    expect(inviteStatusText({ channel: 'in_app', status: 'sent' })).toBe(R.inApp);
    expect(inviteStatusText({ channel: 'in_app', status: 'pending' })).toBe(R.inApp);
    expect(inviteStatusText({ channel: 'whatsapp', status: 'sent' })).toBe(R.sent);
    expect(inviteStatusText({ channel: 'whatsapp', status: 'window_closed' })).toBe(R.windowClosed);
    expect(inviteStatusText({ channel: 'link', status: 'failed' })).toBe(R.failed);
    expect(inviteStatusText({ channel: 'whatsapp', status: 'cancelled' })).toBe(R.cancelled);
    expect(inviteStatusText({ channel: 'link', status: 'window_closed', error_code: 'chat_not_allowed' })).toBe(R.linkOnly);
  });

  it('explains why nothing went out: a closed window, or a creator who may not send WhatsApp', () => {
    expect(notSentHint({ channel: 'link', status: 'window_closed', error_code: 'session_closed' })).toBe(R.windowClosedHint);
    expect(notSentHint({ channel: 'link', status: 'window_closed', error_code: 'chat_not_allowed' })).toBe(R.linkOnlyHint);
    expect(notSentHint({ channel: 'whatsapp', status: 'sent' })).toBeNull();
  });

  it('copies the invitation text (it carries the link), the link alone without one, nothing without a link', () => {
    expect(copyPayload({ link: 'https://x.test/m/1', invitation_text: 'نص https://x.test/m/1' })).toBe('نص https://x.test/m/1');
    expect(copyPayload({ link: 'https://x.test/m/1', invitation_text: null })).toBe('https://x.test/m/1');
    expect(copyPayload({ link: null, invitation_text: 'نص' })).toBeNull();
  });
});
