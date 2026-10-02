import { RECEIPT_MAX_BYTES, RECEIPT_MIMES } from '@ab/shared';
import { useEffect, useId, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { t } from '@/lib/i18n';

type Props = { file: File | null; onChange: (file: File | null) => void; error?: string | null };

/** The receipt picker with a local preview (image, or the PDF's name) before anything uploads. */
export function ReceiptField({ file, onChange, error }: Props) {
  const id = useId();
  const preview = useMemo(() => (file?.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  return (
    <div className="grid content-start gap-1.5">
      <Label htmlFor={id}>{t.payments.receipt}</Label>
      <input
        id={id}
        type="file"
        accept={RECEIPT_MIMES.join(',')}
        aria-invalid={error ? true : undefined}
        className="text-sm text-ink-2 file:me-3 file:min-h-10 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-secondary file:px-3 file:font-semibold file:text-ink"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      {file && (
        <div className="flex items-center gap-3">
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
        </div>
      )}
    </div>
  );
}

/** Client-side check before the upload (the API and the bucket check again). */
export function receiptProblem(file: File | null): 'receipt_type' | 'receipt_too_large' | null {
  if (!file) return null;
  if (!(RECEIPT_MIMES as readonly string[]).includes(file.type)) return 'receipt_type';
  return file.size > RECEIPT_MAX_BYTES ? 'receipt_too_large' : null;
}
