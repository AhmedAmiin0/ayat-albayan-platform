import { Cartouche, PageHead, t } from '@ab/web-kit';
import { InternalMeetingButton } from '@/features/teaching/meetings';
import { InternalMeetingsList } from '@/features/teaching/meetings';

/** Instant or scheduled meetings with invitations, then the ones I created or am invited to. */
export function SalesMeetings() {
  return (
    <>
      <PageHead>
        <Cartouche>{t.meetingInvites.list.title}</Cartouche>
        <div className="ms-auto">
          <InternalMeetingButton />
        </div>
      </PageHead>
      <InternalMeetingsList />
    </>
  );
}
