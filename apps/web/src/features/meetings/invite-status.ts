import type { MeetingInviteChannel, MeetingInviteStatus } from '@ab/shared';
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

/** One recipient's line: staff «أُرسل إشعار في التطبيق», WhatsApp «أُرسلت» / «النافذة مغلقة» / «رابط للنسخ» / … */
export function inviteStatusText(i: Outcome): string {
  if (i.channel === 'in_app' && (i.status === 'sent' || i.status === 'pending')) return R.inApp;
  return linkOnly(i) ? R.linkOnly : BY_STATUS[i.status];
}

/** Why nothing went out on WhatsApp (a window_closed row), or null. */
export const notSentHint = (i: Outcome): string | null => (i.status !== 'window_closed' ? null : linkOnly(i) ? R.linkOnlyHint : R.windowClosedHint);

/** The text a copy puts on the clipboard: the invitation (it already carries the link), else the link. */
export const copyPayload = (i: { link: string | null; invitation_text: string | null }): string | null =>
  i.link === null ? null : (i.invitation_text ?? i.link);
