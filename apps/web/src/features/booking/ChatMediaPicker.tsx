import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { fullTime } from '@/features/inbox/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { threadMediaQuery, threadMediaUrl } from './api.invoice';
import type { ThreadMediaItem } from './contract';
import type { InvoiceDraft } from './draft';
import { InvoiceThumb } from './InvoiceThumb';
import { isImage } from './invoice-file';

export interface ChatMediaPickerProps {
  /** The family's WhatsApp number (E.164). */
  phone: string;
  onPick: (invoice: Extract<InvoiceDraft, { source: 'whatsapp' }>) => void;
  onClose: () => void;
}

/**
 * «من الشات» (R-MSG-06): the family's recent inbound images and PDFs with thumbnails. The API
 * downloads a file from WhatsApp the first time it is shown, and copies the chosen one into the
 * invoices bucket when the booking is made: the browser never re-downloads it.
 */
export function ChatMediaPicker({ phone, onPick, onClose }: ChatMediaPickerProps) {
  const list = useQuery(threadMediaQuery(phone));
  return (
    <Dialog title={t.booking.invoice.chatTitle} onClose={onClose}>
      {list.isError && <FormAlert>{t.booking.invoice.chatError}</FormAlert>}
      {list.isPending && <p className="text-ink-3">{t.common.loading}</p>}
      {list.data?.length === 0 && <p className="text-sm text-ink-2">{t.booking.invoice.chatEmpty}</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.data?.map((item) => (
          <li key={item.message_id}>
            <MediaCard phone={phone} item={item} onPick={onPick} />
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

function MediaCard({ phone, item, onPick }: { phone: string; item: ThreadMediaItem; onPick: ChatMediaPickerProps['onPick'] }) {
  // Each card fetches its own file lazily; an expired one never asks.
  const file = useQuery({ ...threadMediaUrl(phone, item.message_id), enabled: !item.expired });
  const src = file.data?.url ?? null;
  return (
    <button
      type="button"
      disabled={item.expired}
      aria-label={fullTime(item.created_at)}
      onClick={() => onPick({ source: 'whatsapp', messageId: item.message_id, mime: item.mime, preview: isImage(item.mime) ? src : null })}
      className={cn(
        'grid w-full justify-items-center gap-1.5 rounded-md border border-rule p-2 text-xs',
        item.expired ? 'cursor-not-allowed opacity-60' : 'hover:bg-sunk focus-visible:outline-2 focus-visible:outline-ring',
      )}
    >
      <InvoiceThumb src={src} mime={item.mime} />
      <span className="text-ink-2">{fullTime(item.created_at)}</span>
      {item.caption && <span className="max-w-full truncate text-ink-3">{item.caption}</span>}
      {item.expired && <span className="text-danger">{t.booking.invoice.expired}</span>}
      {file.isError && !item.expired && <span className="text-danger">{t.common.error}</span>}
    </button>
  );
}
