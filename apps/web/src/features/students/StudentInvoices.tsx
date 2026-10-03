import { useQuery } from '@tanstack/react-query';
import { invoicesQuery } from '@/features/booking/api.invoice';
import { InvoiceButton } from '@/features/booking/InvoiceDialog';
import { fullTime } from '@/features/inbox/format';
import { t } from '@/lib/i18n';

/**
 * «الفواتير» on the student's profile (R-PAY-03): the payment proofs of this student's bookings,
 * newest first, each with its type and where it came from. Nothing while there are none (a trial
 * has no invoice), and nothing for a role the endpoint refuses.
 */
export function StudentInvoices({ studentId }: { studentId: string }) {
  const invoices = useQuery(invoicesQuery({ studentId }));
  if (!invoices.data || invoices.data.length === 0) return null;
  return (
    <section aria-labelledby="student-invoices" className="mb-6 grid gap-2">
      <h3 id="student-invoices" className="text-sm font-semibold">
        {t.booking.invoice.list}
      </h3>
      <ul className="grid gap-1">
        {invoices.data.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule py-2 text-sm">
            <span className="tabular-nums">{fullTime(i.created_at)}</span>
            <span className="text-ink-2">{t.booking.kind[i.kind]}</span>
            <span className="text-xs text-ink-3">
              {i.source === 'whatsapp' ? t.booking.invoice.sourceWhatsapp : t.booking.invoice.sourceUpload}
            </span>
            <span className="ms-auto">
              <InvoiceButton invoice={i} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
