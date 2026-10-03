import { RIYADH_TZ, lessonWhenText } from '@ab/shared';
import { Image, Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { AppText } from '@/ui/AppText';
import { shape, type, useTheme } from '@/theme';
import type { ThreadMediaItem } from './contract';
import { useMediaUrl } from './invoice-queries';

export interface MediaCardProps {
  phone: string;
  item: ThreadMediaItem;
  /** The file, with its thumbnail when the API has already served it. */
  onPick: (item: ThreadMediaItem, thumbnail: string | null) => void;
}

/**
 * One inbound image or PDF of the chat. An image asks the API for its signed URL as it mounts (the
 * API downloads it from WhatsApp the first time); a PDF is a file tile. One past WhatsApp's ~30
 * days is disabled and says why: the guardian has to send it again.
 */
export function MediaCard({ phone, item, onPick }: MediaCardProps) {
  const { color } = useTheme();
  const image = item.mime.startsWith('image/');
  const file = useMediaUrl(phone, item.message_id, image && !item.expired);
  const uri = file.data?.url ?? null;
  const when = lessonWhenText(new Date(item.created_at), RIYADH_TZ, locale);
  const label = item.expired ? `${when} · ${t.booking.invoice.expired}` : when;
  const small = { fontFamily: type.ui[400], fontSize: type.size['2xs'], color: color.ink2 };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: item.expired }}
      disabled={item.expired}
      onPress={() => onPick(item, uri)}
      style={{
        width: 104,
        gap: 4,
        padding: 4,
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.ruleInput,
        backgroundColor: color.raised,
        opacity: item.expired ? 0.5 : 1,
      }}
    >
      <View style={{ height: 96, borderRadius: shape.radius.sm, backgroundColor: color.sunk, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {uri ? (
          <Image source={{ uri }} accessibilityIgnoresInvertColors resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        ) : (
          <AppText style={{ ...small, color: color.ink }}>
            {image ? '' : t.booking.mobile.pdfFile}
          </AppText>
        )}
      </View>
      <AppText numberOfLines={2} style={small}>
        {item.expired ? t.booking.invoice.expired : (item.caption ?? when)}
      </AppText>
    </Pressable>
  );
}
