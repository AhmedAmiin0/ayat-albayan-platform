import type { MeetingCreateResult } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { InviteResults } from '@/features/teaching/meetings/invitees/InviteResults';
import { MeetingLinkBox } from '@/features/teaching/meetings/rows/MeetingLinkBox';

/** After «أنشئ»: the shareable link (as before) and, when there were invitees, one result per recipient. */
export function CreatedMeeting({ made }: { made: MeetingCreateResult }) {
  return (
    <div className="grid gap-5">
      <MeetingLinkBox url={made.url} note={t.meetings.internal.ready} />
      <InviteResults results={made.invitees} />
    </div>
  );
}
