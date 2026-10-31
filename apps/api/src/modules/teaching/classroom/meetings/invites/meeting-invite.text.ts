import { lessonWhenText } from '@ab/shared';
import { ar } from '@/common/infra/i18n/server-text';
import { cityOf, fill } from '@/modules/reporting/report-pdf/render/pdf-text';
import { INVITE_DEDUP_PREFIX } from './meeting-invitees.queries';

// R-MEET-02: the invitation's words (ar.json meetingInvites.message, read per call so the admins'
// overrides apply) and its dedup keys (rule 8). Pure.

/** The instant a meeting's invitations are about: its start as ISO (a '+00:00' row reads the same), or «instant». */
export const whenKey = (startsAt: string | null): string => (startsAt ? new Date(startsAt).toISOString() : 'instant');

/** «الأحد 4 أكتوبر 17:00» in the reader's tz, or «الآن» for an instant meeting. */
export const whenText = (startsAt: string | null, tz: string): string =>
  startsAt ? lessonWhenText(new Date(startsAt), tz) : ar.meetingInvites.message.now;

/** The time an invitee reads; a number nobody knows also names the tz it is written in (the creator's). */
export function inviteeWhen(startsAt: string | null, i: { kind: string; tz: string; display_name: string; phone_e164: string | null }): string {
  const when = whenText(startsAt, i.tz);
  const unknown = i.kind === 'phone' && i.display_name === i.phone_e164;
  return startsAt && unknown ? fill(ar.meetingInvites.message.inTz, { when, tz: cityOf(i.tz) }) : when;
}

/** The chat message (and the text the creator copies when the window is closed). */
export const invitationText = (v: { title: string; when: string; link: string }): string => fill(ar.meetingInvites.message.invite, v);

export const cancellationText = (v: { title: string; when: string }): string => fill(ar.meetingInvites.message.cancelled, v);

/** The bell row's subject: PushService keys it `meeting_invite:{meeting}:{startsAt|instant}:{profile}`. */
export const inviteSubject = (meetingId: string, startsAt: string | null): string => `${meetingId}:${whenKey(startsAt)}`;

/** A family's WhatsApp invitation: once per meeting, phone and time (a reschedule is a new key). */
export const inviteDedupKey = (v: { meetingId: string; phone: string; startsAt: string | null }): string =>
  `${INVITE_DEDUP_PREFIX}${v.meetingId}:${v.phone}:${whenKey(v.startsAt)}`;

/** «أعد الإرسال»: the client's request id makes a double tap one message. */
export const resendDedupKey = (v: { meetingId: string; phone: string; startsAt: string | null }, requestId: string): string =>
  `${inviteDedupKey(v)}:resend:${requestId}`;

/** The cancellation chat message: once per meeting and phone (not counted in the daily limit). */
export const cancelDedupKey = (meetingId: string, phone: string): string => `meeting_cancel:${meetingId}:${phone}`;
