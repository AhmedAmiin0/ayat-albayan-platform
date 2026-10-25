import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { canShow, isImage } from './invoice-file';

export interface InvoiceThumbProps {
  /** The image (object or signed URL), when there is one to show. */
  src: string | null;
  mime: string;
  /** Under a PDF tile: the file name. */
  name?: string | undefined;
  className?: string;
}

/** An invoice's thumbnail: the image itself, or a PDF tile (icon + name) when it is not an image or still loading. */
export function InvoiceThumb({ src, mime, name, className }: InvoiceThumbProps) {
  if (canShow(mime) && src) {
    return <img src={src} alt={t.booking.invoice.preview} className={cn('h-24 w-auto rounded-sm border border-rule object-contain', className)} />;
  }
  return (
    <span className={cn('grid h-24 min-w-20 place-items-center content-center gap-1 rounded-sm border border-rule bg-sunk px-3 text-ink-2', className)}>
      <Icon name="receipt" className="size-6" />
      <span className="text-xs font-semibold" dir="ltr">
        {!isImage(mime) ? t.booking.invoice.pdf : canShow(mime) ? '…' : 'HEIC'}
      </span>
      {name && !canShow(mime) && (
        <span className="max-w-32 truncate text-2xs" dir="ltr">
          {name}
        </span>
      )}
    </span>
  );
}
