import type { InvoiceView } from '@ab/shared';
import { memo } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { invoiceStudents, invoiceSubtitle } from './invoice-text';
import { useViewerTz } from '@/core/lib/clock';

/** One booking invoice: its students, day and source, and whether a payment was recorded from it. */
export const InvoiceRow = memo(function InvoiceRow({ invoice }: { invoice: InvoiceView }) {
  const tz = useViewerTz();
  return (
    <ListRow
      title={invoiceStudents(invoice)}
      subtitle={invoiceSubtitle(invoice, tz)}
      trailing={
        invoice.payment_id ? (
          <StatusChip tone="ok" glyph="fill" label={t.finance.invoicePaid} size="sm" />
        ) : (
          <StatusChip tone="neutral" glyph="hollow" label={t.mobileFinance.invoices.notRecorded} size="sm" />
        )
      }
    />
  );
});
