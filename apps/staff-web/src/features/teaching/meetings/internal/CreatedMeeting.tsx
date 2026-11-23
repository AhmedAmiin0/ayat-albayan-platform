import type { MeetingCreateResult } from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
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
