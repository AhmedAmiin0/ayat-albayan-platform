import type { LessonView } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { invoicesQuery } from '@/features/teaching/booking/invoice/api.invoice';
import { InvoiceButton } from '@/features/teaching/booking/invoice/InvoiceDialog';
import { t } from '@ab/web-kit';

/** Admin only (R-PAY-03); a trial has none; the endpoint refuses teachers anyway. */
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
