import { RIYADH_TZ, lessonWhenText } from '@ab/shared';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { AppText } from '@/core/ui/primitives/AppText';
import { shape, type, useTheme } from '@/theme';
import type { ThreadMediaItem } from './contract';
import { useMediaUrl } from './invoice-queries';
import { ReceiptIcon } from './ReceiptIcon';

export interface MediaCardProps {
  phone: string;
  item: ThreadMediaItem;
  /** The file, with its thumbnail when the API has already served it. */
  onPick: (item: ThreadMediaItem, thumbnail: string | null) => void;
}

/**
 * One inbound image or PDF of the chat. An image asks the API for its signed URL as it mounts (the
 * API downloads it from WhatsApp the first time) and shows a spinner meanwhile; if that fails the
 * tile says so and a tap tries again. A PDF is a file tile with the receipt icon. One past
 * WhatsApp's ~30 days is disabled with a short «انتهت صلاحيته» badge at full contrast (the sheet
 * explains once what to do).
 */
export function MediaCard({ phone, item, onPick }: MediaCardProps) {
  const { color } = useTheme();
  const image = item.mime.startsWith('image/');
  const file = useMediaUrl(phone, item.message_id, image && !item.expired);
  const uri = file.data?.url ?? null;
  const failed = image && !item.expired && file.isError;
  const when = lessonWhenText(new Date(item.created_at), RIYADH_TZ, locale);
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.expired ? `${when} · ${t.booking.invoice.expiredBadge}` : failed ? `${when} · ${t.booking.invoice.thumbRetry}` : when}
      accessibilityState={{ disabled: item.expired }}
      disabled={item.expired}
      onPress={() => (failed ? void file.refetch() : onPick(item, uri))}
      style={{
        width: 104,
        minHeight: 44,
        gap: 4,
        padding: 4,
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.ruleInput,
        backgroundColor: color.raised,
      }}
    >
      <View style={{ height: 96, borderRadius: shape.radius.sm, backgroundColor: color.sunk, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4, overflow: 'hidden' }}>
        <Tile {...{ uri, image, expired: item.expired, failed }} />
      </View>
      <AppText numberOfLines={2} style={small}>
        {item.caption ?? when}
      </AppText>
    </Pressable>
  );
}

/** What the 96pt tile shows: the thumbnail, the PDF icon, the expired badge, the failure, or a spinner. */
function Tile(p: { uri: string | null; image: boolean; expired: boolean; failed: boolean }) {
  const { color } = useTheme();
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2, textAlign: 'center' as const };
  if (p.uri) return <Image source={{ uri: p.uri }} accessibilityIgnoresInvertColors resizeMode="cover" style={{ width: '100%', height: '100%' }} />;
  if (!p.image) {
    return (
      <>
        <ReceiptIcon />
        <AppText style={{ ...small, fontFamily: type.ui[600], color: color.ink }}>{t.booking.mobile.pdfFile}</AppText>
      </>
    );
  }
  if (p.expired) return <AppText style={{ ...small, fontFamily: type.ui[600], color: color.ink }}>{t.booking.invoice.expiredBadge}</AppText>;
  if (p.failed) return <AppText style={small}>{t.booking.invoice.thumbRetry}</AppText>;
  return <ActivityIndicator accessibilityRole="progressbar" accessibilityLabel={t.common.loading} color={color.ink3} />;
}
