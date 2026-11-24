import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { InternalMeetingButton } from '@/features/teaching/meetings/internal/InternalMeetingButton';
import { InternalMeetingsList } from '@/features/teaching/meetings/internal/InternalMeetingsList';
import { t } from '@ab/web-kit/lib/i18n/i18n';

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
