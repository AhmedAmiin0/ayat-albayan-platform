import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import type { InvoiceDraft } from '../draft/draft';
import { InvoiceThumb } from './InvoiceThumb';
import { canShow } from './invoice-file';

export interface InvoiceChosenProps {
  value: InvoiceDraft;
  /** A new file is going up: the old invoice stays until it lands. */
  uploading: boolean;
  onRemove: () => void;
}

/** The invoice that is attached: its thumbnail (opens full size), where it came from, and «شيلها». */
export function InvoiceChosen({ value, uploading, onRemove }: InvoiceChosenProps) {
  const thumb = <InvoiceThumb src={value.preview} mime={value.mime} name={value.source === 'upload' ? value.name : undefined} />;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {canShow(value.mime) && value.preview ? (
        <a href={value.preview} target="_blank" rel="noreferrer" aria-label={t.booking.invoice.openFull}>
          {thumb}
        </a>
      ) : (
        thumb
      )}
      <span className="text-sm text-ink-2">{value.source === 'whatsapp' ? t.booking.invoice.sourceWhatsapp : t.booking.invoice.sourceUpload}</span>
      <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={onRemove}>
        {t.booking.invoice.remove}
      </Button>
    </div>
  );
}
