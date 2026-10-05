import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { fullTime } from '@/features/inbox/format';
import { t } from '@/lib/i18n';
import { invoiceDownload } from './api.invoice';
import type { InvoiceView } from './contract';
import { canShow } from './invoice-file';

/** «الفاتورة · <student> · <date>»: the title names whose invoice and when it was saved. */
function title(invoice: InvoiceView): string {
  const who = invoice.students.map((s) => s.name).join(t.teachers.listSeparator);
  return [t.booking.invoice.label, who, fullTime(invoice.created_at)].filter(Boolean).join(' · ');
}

/** A stored invoice through a 1-hour signed URL: the image inline, a PDF in a frame (admin only). */
export function InvoiceDialog({ invoice, onClose }: { invoice: InvoiceView; onClose: () => void }) {
  const signed = useQuery({
    queryKey: ['invoices', 'download', invoice.id],
    queryFn: () => invoiceDownload(invoice.id),
    staleTime: 30 * 60_000,
  });
  return (
    <Dialog title={title(invoice)} onClose={onClose} layout="center">
      {signed.isError && <FormAlert>{t.common.error}</FormAlert>}
      {signed.isPending && <p className="text-ink-3">{t.common.loading}</p>}
      {signed.data &&
        (canShow(invoice.mime) ? (
          <img src={signed.data.url} alt={t.booking.invoice.label} className="mx-auto max-h-[70vh] w-auto rounded-sm border border-rule" />
        ) : (
          <iframe title={title(invoice)} src={signed.data.url} className="h-[70vh] w-full rounded-sm border border-rule" />
        ))}
      {signed.data && (
        <a href={signed.data.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-lapis underline underline-offset-4">
          {t.booking.invoice.openNewTab}
        </a>
      )}
    </Dialog>
  );
}

/** «افتح الفاتورة»: opens the invoice in a dialog. */
export function InvoiceButton({ invoice }: { invoice: InvoiceView }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t.booking.invoice.view}
      </Button>
      {open && <InvoiceDialog invoice={invoice} onClose={() => setOpen(false)} />}
    </>
  );
}
