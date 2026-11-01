import type { StickerItem } from '@ab/shared';
import { ActivityIndicator, ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Note } from '@/core/ui/feedback/Note';
import { type PanelMedia, usePanelSend, useStickers } from './panel-api';
import { StickerRow } from './StickerCell';

interface StickerTabProps {
  media: PanelMedia;
  onSent: () => void;
}

/**
 * «الملصقات» (owner 2026-11-01): this staff member's favourites, then the newest stickers of any
 * chat, deduplicated by the API. A tap sends that sticker as it is stored (WhatsApp's `sticker`).
 */
export function StickerTab({ media, onSent }: StickerTabProps) {
  const { color } = useTheme();
  const list = useStickers();
  const send = usePanelSend(media.phone, media.onError);
  const pick = (item: StickerItem) => {
    media.onError(null);
    send.mutate({ kind: 'sticker', messageId: item.message_id });
    onSent();
  };
  const busy = <ActivityIndicator accessibilityLabel={t.common.loading} color={color.ink3} />;
  if (list.isPending) return busy;
  const favourites = list.data?.favourites ?? [];
  const recent = list.data?.recent ?? [];
  if (favourites.length + recent.length === 0) return <Note>{t.inbox.composer.stickersEmpty}</Note>;
  return (
    <ScrollView contentContainerStyle={{ gap: 12 }}>
      <StickerRow title={t.inbox.composer.stickerFavourites} items={favourites} onPick={pick} />
      <StickerRow title={t.inbox.composer.stickerRecent} items={recent} onPick={pick} />
    </ScrollView>
  );
}
