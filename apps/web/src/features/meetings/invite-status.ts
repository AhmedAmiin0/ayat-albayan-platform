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

/** One recipient's line: staff «أُرسل إشعار في التطبيق», WhatsApp «أُرسلت» / «النافذة مغلقة» / … */
export function inviteStatusText(i: { channel: MeetingInviteChannel; status: MeetingInviteStatus }): string {
  if (i.channel === 'in_app' && (i.status === 'sent' || i.status === 'pending')) return R.inApp;
  return BY_STATUS[i.status];
}

/** The text a copy puts on the clipboard: the invitation (it already carries the link), else the link. */
export const copyPayload = (i: { link: string | null; invitation_text: string | null }): string | null =>
  i.link === null ? null : (i.invitation_text ?? i.link);
