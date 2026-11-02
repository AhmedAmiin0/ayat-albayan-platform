import type { GifItem } from '@ab/shared';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, useTheme } from '@/theme';
import { Note } from '@/core/ui/feedback/Note';
import { SearchField } from '@/core/ui/form/SearchField';
import { type PanelMedia, useGifs, usePanelSend } from './panel-api';

interface GifTabProps {
  media: PanelMedia;
  onSent: () => void;
}

/** One GIF: its small animated preview (Android plays GIFs in an Image), half the panel wide. */
function GifCell({ gif, onPick }: { gif: GifItem; onPick: (gif: GifItem) => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      testID={`gif-${gif.id}`}
      accessibilityRole="button"
      accessibilityLabel={t.inbox.composer.gifSend.replace('{title}', gif.title)}
      onPress={() => onPick(gif)}
      style={{
        flex: 1,
        aspectRatio: gif.width / gif.height,
        margin: 2,
        borderRadius: shape.radius.md,
        overflow: 'hidden',
        backgroundColor: color.sunk,
      }}
    >
      <Image source={{ uri: gif.preview }} resizeMode="cover" style={{ flex: 1 }} />
    </Pressable>
  );
}

/**
 * «GIF» (owner 2026-11-01): GIPHY's trending GIFs, or a search; a tap sends it as a WhatsApp video.
 * Without a GIPHY key in «التكاملات» the tab says an admin must add it.
 */
export function GifTab({ media, onSent }: GifTabProps) {
  const { color } = useTheme();
  const [q, setQ] = useState('');
  const gifs = useGifs(q);
  const send = usePanelSend(media.phone, media.onError);
  const pick = (gif: GifItem) => {
    media.onError(null);
    send.mutate({ kind: 'gif', gifId: gif.id });
    onSent();
  };
  if (gifs.data?.configured === false) return <Note>{t.inbox.composer.gifNoKey}</Note>;
  const items = gifs.data?.items ?? [];
  const busy = t.common.loading;
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <SearchField compact label={t.inbox.composer.gifSearch} onSearch={setQ} />
      {gifs.isPending ? <ActivityIndicator accessibilityLabel={busy} color={color.ink3} /> : null}
      {gifs.isSuccess && items.length === 0 ? <Note>{t.inbox.composer.gifEmpty}</Note> : null}
      {gifs.isError ? <Note alert>{t.inbox.error.giphy_failed}</Note> : null}
      <FlatList
        data={items}
        keyExtractor={(g) => g.id}
        numColumns={2}
        renderItem={({ item }) => <GifCell gif={item} onPick={pick} />}
      />
      <Note>{t.inbox.composer.gifPowered}</Note>
    </View>
  );
}
