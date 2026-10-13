import type { MeetingInviteChannel, MeetingInviteeKind, MeetingInviteStatus } from '@ab/shared';
import { t } from '@/lib/i18n';

const R = t.meetingInvites.results;
const BY_STATUS: Record<MeetingInviteStatus, string> = {
  pending: R.pending,
  sent: R.sent,
  window_closed: R.windowClosed,
  failed: R.failed,
  cancelled: R.cancelled,
};

type Outcome = { channel: MeetingInviteChannel; status: MeetingInviteStatus; error_code?: string | null };
/** The creator may not send WhatsApp (owner policy 2026-10-13): the invitation is a link to copy. */
const linkOnly = (i: Outcome) => i.error_code === 'chat_not_allowed';

/** One recipient's line: staff «أُرسل إشعار في التطبيق», WhatsApp «أُرسلت» / «النافذة مغلقة» / «رابط للنسخ» / «بلغت الحد اليومي…» / … */
export function inviteStatusText(i: Outcome): string {
  if (i.channel === 'in_app' && (i.status === 'sent' || i.status === 'pending')) return R.inApp;
  if (i.status === 'failed' && i.error_code === 'invite_limit') return R.inviteLimit;
  return linkOnly(i) ? R.linkOnly : BY_STATUS[i.status];
}

/** Why nothing went out on WhatsApp (a window_closed row), or null. */
export const notSentHint = (i: Outcome): string | null => (i.status !== 'window_closed' ? null : linkOnly(i) ? R.linkOnlyHint : R.windowClosedHint);

/** The text a copy puts on the clipboard: the invitation (it already carries the link), else the link. */
export const copyPayload = (i: { link: string | null; invitation_text: string | null }): string | null =>
  i.link === null ? null : (i.invitation_text ?? i.link);

type Row = { kind: MeetingInviteeKind; display_name: string; status: MeetingInviteStatus };

/** «أعد الإرسال»: never staff or a cancelled row; a typed phone for admin and sales only (the API answers 403). */
export const mayResend = (i: Row, mayInvitePhones: boolean): boolean =>
  i.kind !== 'staff' && i.status !== 'cancelled' && (i.kind !== 'phone' || mayInvitePhones);

/** The row's name; a phone row whose name the API hides reads «رقم هاتف». */
export const inviteeName = (i: Row): string => i.display_name || (i.kind === 'phone' ? t.meetingInvites.tabs.phone : '');

/** A shown number reads left to right. */
export const nameDir = (i: Row): 'ltr' | undefined => (i.kind === 'phone' && i.display_name !== '' ? 'ltr' : undefined);
