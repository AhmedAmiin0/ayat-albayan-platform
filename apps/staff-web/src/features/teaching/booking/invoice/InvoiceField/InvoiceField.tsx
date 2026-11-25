import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button, buttonVariants, RequiredMark, t, cn, useUploadMaxBytes } from '@ab/web-kit';
import { lessonErrorText } from '@/features/teaching/schedule';
import { uploadInvoiceFile } from '@/features/teaching/booking/invoice/api.invoice';
import { ChatMediaPicker } from '@/features/teaching/booking/invoice/ChatMediaPicker';
import type { InvoiceDraft } from '@/features/teaching/booking/draft/draft';
import { InvoiceChosen } from '@/features/teaching/booking/invoice/InvoiceChosen';
import { canShow, invoiceMime, invoiceProblem } from '@/features/teaching/booking/invoice/invoice-file';

export interface InvoiceFieldProps {
  value: InvoiceDraft | null;
  /** The wizard's request id: the upload path belongs to it. */
  requestId: string;
  /** The family's WhatsApp number; picking from the chat shows only with it. */
  chatPhone: string | null;
  onChange: (invoice: InvoiceDraft | null) => void;
}

const FOCUS = 'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-(--lapis)';

/** Payment proof (R-PAY-03, R-MSG-06): a new pick replaces the old only once landed. */
export function InvoiceField({ value, requestId, chatPhone, onChange }: InvoiceFieldProps) {
  const id = useId();
  const maxBytes = useUploadMaxBytes();
  const [chat, setChat] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: (file: File) => uploadInvoiceFile({ requestId, file }),
    onSuccess: (path, file) =>
      onChange({
        source: 'upload',
        path,
        name: file.name,
        mime: invoiceMime(file),
        preview: canShow(invoiceMime(file)) ? URL.createObjectURL(file) : null,
      }),
  });

  function pick(file: File | null) {
    if (!file) return;
    const bad = invoiceProblem(file, maxBytes);
    setProblem(bad ? t.booking.error[bad] : null);
    if (bad) return;
    upload.mutate(file);
  }

  // Every way of changing the invoice clears the old upload error with it.
  function settle(next: InvoiceDraft | null) {
    upload.reset();
    setProblem(null);
    onChange(next);
  }

  const error = problem ?? (upload.isError ? lessonErrorText(upload.error) : null);
  return (
    <div className="grid content-start gap-1.5">
      <span className="text-sm font-semibold text-ink">
        {t.booking.invoice.label}
        <RequiredMark />
      </span>
      <p className="text-xs text-ink-3">{t.booking.invoice.hint}</p>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={id} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), FOCUS, upload.isPending && 'pointer-events-none opacity-50')}>
          {value ? t.booking.invoice.replace : t.booking.invoice.upload}
          <input
            id={id}
            type="file"
            accept="image/*,.heic,.heif,application/pdf"
            aria-invalid={error ? true : undefined}
            aria-required
            disabled={upload.isPending}
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
        </label>
        {chatPhone && (
          <Button type="button" variant="secondary" size="sm" disabled={upload.isPending} onClick={() => setChat(true)}>
            {t.booking.invoice.fromChat}
          </Button>
        )}
        {upload.isPending && (
          <span role="status" className="flex items-center gap-2 text-sm text-ink-3">
            <span aria-hidden className="size-4 rounded-full border-2 border-rule border-t-ink-2 motion-safe:animate-spin" />
            {t.booking.invoice.uploading}
          </span>
        )}
      </div>
      {value && <InvoiceChosen value={value} uploading={upload.isPending} onRemove={() => settle(null)} />}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      {chat && chatPhone && (
        <ChatMediaPicker
          phone={chatPhone}
          onClose={() => setChat(false)}
          onPick={(invoice) => {
            setChat(false);
            settle(invoice);
          }}
        />
      )}
    </div>
  );
}
