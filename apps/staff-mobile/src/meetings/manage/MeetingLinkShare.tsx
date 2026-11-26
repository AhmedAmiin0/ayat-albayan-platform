import { Share, View } from 'react-native';
import { t, type, useTheme, Button, AppText } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';

/** The link is shown only once. */
export function MeetingLinkShare({ url, note }: { url: string; note: string }) {
  const { color } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
      <Note>{note}</Note>
      {/* Plain text, no isolates: a copied URL must open as it is. */}
      <AppText
        selectable
        numberOfLines={2}
        style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}
      >
        {url}
      </AppText>
      <Button variant="secondary" label={t.mobileClassroom.shareLink} onPress={() => void Share.share({ message: url }).catch(() => undefined)} />
    </View>
  );
}
