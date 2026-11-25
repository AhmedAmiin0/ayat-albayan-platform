import type { MeetingCreateResult } from '@ab/schedule';
import { t } from '@ab/web-kit';
import { InviteResults } from '@/features/teaching/meetings/invitees/InviteResults';
import { MeetingLinkBox } from '@/features/teaching/meetings/rows/MeetingLinkBox';

export function CreatedMeeting({ made }: { made: MeetingCreateResult }) {
  return (
    <div className="grid gap-5">
      <MeetingLinkBox url={made.url} note={t.meetings.internal.ready} />
      <InviteResults results={made.invitees} />
    </div>
  );
}
