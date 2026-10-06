import { Link } from '@tanstack/react-router';
import type { BookSearch } from '@/features/booking/api';
import { LeadBooking } from '@/features/booking/booking-entries';
import { BookingModeContext } from '@/features/booking/mode';
import { Cartouche } from '@/components/ui/cartouche';
import { PageHead } from '@/components/ui/page';
import { t } from '@/lib/i18n';

const noop = () => undefined;

/**
 * /sales/register «تسجيل طالب» (R-ASST-01): the booking wizard in sales mode, opened from a chat of mine
 * (`?leadId&phone&name`): the API books a new family only from the assistant's own lead. It registers the
 * guardian and the student, picks the teacher and the trial lesson's time; the student is credited to me.
 * No price, no invoice, no package. Without a chat it points to the inbox.
 */
export function SalesRegister({ search }: { search: BookSearch }) {
  return (
    <BookingModeContext.Provider value="sales">
      <PageHead>
        <Cartouche>{t.assistantPortal.register.title}</Cartouche>
      </PageHead>
      <p className="mb-5 max-w-[60ch] text-sm text-ink-2">{t.assistantPortal.register.intro}</p>
      {search.leadId ? (
        <LeadBooking key={search.leadId} search={search} hint={null} onOpenStudent={noop} />
      ) : (
        <Link to="/sales/inbox" search={{ page: 1 }} className="text-sm font-semibold text-brand underline">
          {t.assistantPortal.register.openInbox}
        </Link>
      )}
    </BookingModeContext.Provider>
  );
}
