import { Cartouche } from '@/components/ui/display/cartouche';
import { PageHead } from '@/components/ui/layout/page';
import { InternalMeetingButton } from '@/features/teaching/meetings/internal/InternalMeetingButton';
import { InternalMeetingsList } from '@/features/teaching/meetings/internal/InternalMeetingsList';
import { t } from '@/lib/i18n/i18n';

/**
 * /sales/meetings «الاجتماعات» (owner 2026-10-12: back for sales): «اجتماع داخلي» now or «اجتماع
 * مجدول» with invitations, then the meetings I created or am invited to.
 */
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
