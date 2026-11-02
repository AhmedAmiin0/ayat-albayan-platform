import { Share, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { type, useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { AppText } from '@/core/ui/primitives/AppText';

/** The meeting's link (shown once) with «شارك الرابط»: the share sheet has Copy, WhatsApp and the rest. */
export function MeetingLinkShare({ url, note }: { url: string; note: string }) {
  const { color } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
      <Note>{note}</Note>
      {/* Plain text, no isolates: a copied URL must open as it is. */}
      <AppText selectable numberOfLines={2} style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}>
        {url}
      </AppText>
      <Button variant="secondary" label={t.mobileClassroom.shareLink} onPress={() => void Share.share({ message: url }).catch(() => undefined)} />
    </View>
  );
}
