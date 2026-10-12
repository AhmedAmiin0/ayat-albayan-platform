import { Cartouche } from '@/components/ui/cartouche';
import { PageHead } from '@/components/ui/page';
import { InternalMeetingButton } from '@/features/meetings/InternalMeetingButton';
import { InternalMeetingsList } from '@/features/meetings/InternalMeetingsList';
import { t } from '@/lib/i18n';

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
