import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { RequiredMark } from '@/components/ui/label';
import { lessonErrorText } from '@/features/schedule/api';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { uploadInvoiceFile } from './api.invoice';
import { ChatMediaPicker } from './ChatMediaPicker';
import type { InvoiceDraft } from './draft';
import { InvoiceThumb } from './InvoiceThumb';
import { invoiceProblem, isImage } from './invoice-file';

export interface InvoiceFieldProps {
  value: InvoiceDraft | null;
  /** The wizard's request id: the upload path belongs to it. */
  requestId: string;
  /** The family's WhatsApp number; «من الشات» shows only with it. */
  chatPhone: string | null;
  onChange: (invoice: InvoiceDraft | null) => void;
}

const FOCUS = 'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-(--lapis)';

/**
 * «الفاتورة *» (R-PAY-03): a photo or PDF of the payment proof, uploaded from the device (straight
 * to the private bucket at once) or saved from the family's chat (R-MSG-06). Picking a new one
 * replaces the old; the form is not ready while an upload runs.
 */
export function InvoiceField({ value, requestId, chatPhone, onChange }: InvoiceFieldProps) {
  const id = useId();
  const [chat, setChat] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: (file: File) => uploadInvoiceFile({ requestId, file }),
    onSuccess: (path, file) =>
      onChange({
        source: 'upload',
        path,
        name: file.name,
        mime: file.type,
        preview: isImage(file.type) ? URL.createObjectURL(file) : null,
      }),
  });

  function pick(file: File | null) {
    if (!file) return;
    const bad = invoiceProblem(file);
    setProblem(bad ? t.booking.error[bad] : null);
    if (bad) return;
    onChange(null);
    upload.mutate(file);
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
        <label htmlFor={id} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), FOCUS)}>
          {value ? t.booking.invoice.replace : t.booking.invoice.upload}
          <input
            id={id}
            type="file"
            accept="image/*,application/pdf"
            aria-invalid={error ? true : undefined}
            aria-required
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
        </label>
        {chatPhone && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setChat(true)}>
            {t.booking.invoice.fromChat}
          </Button>
        )}
        {upload.isPending && <span role="status" className="text-sm text-ink-3">{t.booking.invoice.uploading}</span>}
      </div>
      {value && (
        <div className="flex flex-wrap items-center gap-3">
          <InvoiceThumb src={value.preview} mime={value.mime} name={value.source === 'upload' ? value.name : undefined} />
          {value.source === 'whatsapp' && <span className="text-sm text-ink-2">{t.booking.invoice.fromChat}</span>}
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            {t.booking.invoice.remove}
          </Button>
        </div>
      )}
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
            setProblem(null);
            onChange(invoice);
          }}
        />
      )}
    </div>
  );
}
