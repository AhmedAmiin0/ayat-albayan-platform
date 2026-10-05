import { RECEIPT_MAX_BYTES, RECEIPT_MIMES } from '@ab/shared';
import { useEffect, useId, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Props = { file: File | null; onChange: (file: File | null) => void; error?: string | null };

/**
 * The receipt picker («إرفاق الإيصال», the native input stays for keyboard and screen readers but
 * its English chrome is hidden) with a local preview, image or the PDF's name, before any upload.
 */
export function ReceiptField({ file, onChange, error }: Props) {
  const id = useId();
  const preview = useMemo(() => (file?.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  return (
    <div className="grid content-start gap-1.5">
      <span className="text-sm font-semibold text-ink">{t.payments.receipt}</span>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={id} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-(--lapis)')}>
          {t.payments.addReceipt}
          <input
            id={id}
            type="file"
            accept={RECEIPT_MIMES.join(',')}
            aria-invalid={error ? true : undefined}
            className="sr-only"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
        {file && (
          <>
            {preview ? (
              <img src={preview} alt={t.payments.receipt} className="h-24 w-auto rounded-sm border border-rule object-contain" />
            ) : (
              <span className="text-sm text-ink-2" dir="ltr">
                {file.name}
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              {t.payments.removeReceipt}
            </Button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Client-side check before the upload, against settings.upload_max_mb (the API and the bucket check again). */
export function receiptProblem(file: File | null, maxBytes = RECEIPT_MAX_BYTES): 'receipt_type' | 'receipt_too_large' | null {
  if (!file) return null;
  if (!(RECEIPT_MIMES as readonly string[]).includes(file.type)) return 'receipt_type';
  return file.size > maxBytes ? 'receipt_too_large' : null;
}
