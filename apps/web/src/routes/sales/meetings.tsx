import { createFileRoute } from '@tanstack/react-router';
import { InternalMeetingButton } from '@/features/meetings/InternalMeetingButton';
import { InternalMeetingsList } from '@/features/meetings/InternalMeetingsList';
import { SalesMeetings } from '@/features/sales/SalesMeetings';

/** /sales/meetings «مواعيدي» — my meetings by day, with «ادخل الحلقة»; then «اجتماع داخلي» and my internal meetings. */
export const Route = createFileRoute('/sales/meetings')({ component: SalesMeetingsPage });

function SalesMeetingsPage() {
  return (
    <>
      <SalesMeetings />
      <div className="mt-6">
        <InternalMeetingButton />
      </div>
      <InternalMeetingsList />
    </>
  );
}
