import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import type { ThreadMediaItem } from './contract';
import { useThreadMedia } from './invoice-queries';
import { MediaCard } from './MediaCard';

export interface ChatMediaSheetProps {
  /** The guardian's WhatsApp number (E.164): the API only copies files from that conversation. */
  phone: string;
  onPick: (item: ThreadMediaItem, thumbnail: string | null) => void;
  onClose: () => void;
}

/**
 * «من الشات»: the guardian's recent images and PDFs, newest first (the API sends at most 12, so a
 * wrapped grid, not a list). Picking one books it as the invoice without downloading anything
 * here: the API copies it from WhatsApp into the invoices bucket.
 */
export function ChatMediaSheet({ phone, onPick, onClose }: ChatMediaSheetProps) {
  const media = useThreadMedia(phone);
  return (
    <View style={{ gap: 12 }}>
      <FormLabel>{t.booking.invoice.fromChat}</FormLabel>
      {media.isPending ? <Note>{t.common.loading}</Note> : null}
      {media.isError ? <ErrorState onRetry={() => void media.refetch()} /> : null}
      {media.data && media.data.length === 0 ? <Note>{t.booking.invoice.chatEmpty}</Note> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(media.data ?? []).map((item) => (
          <MediaCard key={item.message_id} phone={phone} item={item} onPick={onPick} />
        ))}
      </View>
      <Button variant="ghost" label={t.common.cancel} onPress={onClose} />
    </View>
  );
}
