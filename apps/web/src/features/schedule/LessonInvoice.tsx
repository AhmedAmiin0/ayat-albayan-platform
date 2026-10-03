import type { LessonView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { invoicesQuery } from '@/features/booking/api.invoice';
import { InvoiceButton } from '@/features/booking/InvoiceDialog';
import { t } from '@/lib/i18n';

/**
 * The admin-only «الفاتورة» row of the lesson drawer (R-PAY-03): the booking's payment proof, from
 * GET /invoices?ruleId (a trial has none). Teachers never get this component, and the endpoint
 * refuses them anyway.
 */
export function LessonInvoice({ lesson }: { lesson: LessonView }) {
  const ruleId = lesson.rule_id;
  const invoices = useQuery({ ...invoicesQuery({ ruleId: ruleId ?? '' }), enabled: !!ruleId && !lesson.trial });
  if (!invoices.data || invoices.data.length === 0) return null;
  return (
    <div className="grid gap-1.5">
      <p className="text-xs text-ink-3">{t.booking.invoice.label}</p>
      <div className="flex flex-wrap gap-2">
        {invoices.data.map((invoice) => (
          <InvoiceButton key={invoice.id} invoice={invoice} />
        ))}
      </div>
    </div>
  );
}
