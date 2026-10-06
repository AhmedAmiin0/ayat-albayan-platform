import type { BookSearch } from '@/features/booking/api';
import { LeadBooking } from '@/features/booking/booking-entries';
import { BookingWizard } from '@/features/booking/BookingWizard';
import { registrationDraft } from '@/features/booking/draft.sales';
import { BookingModeContext } from '@/features/booking/mode';
import { Cartouche } from '@/components/ui/cartouche';
import { PageHead } from '@/components/ui/page';
import { t } from '@/lib/i18n';

const noop = () => undefined;

/**
 * /sales/register «تسجيل طالب» (R-ASST-01): the booking wizard in sales mode. It registers the
 * guardian and the student (from a chat of mine with `?leadId&phone&name`, or typed), picks the teacher
 * and the trial lesson's time; the student is credited to me. No price, no invoice, no package.
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
        <BookingWizard initial={registrationDraft()} primary={null} siblings={[]} onOpenStudent={noop} />
      )}
    </BookingModeContext.Provider>
  );
}
