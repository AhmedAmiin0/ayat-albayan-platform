import { Share, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { type, useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { Ltr } from '@/ui/Ltr';

/** The meeting's link (shown once) with «شارك الرابط»: the share sheet has Copy, WhatsApp and the rest. */
export function MeetingLinkShare({ url, note }: { url: string; note: string }) {
  const { color } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
      <Note>{note}</Note>
      <Ltr selectable style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}>
        {url}
      </Ltr>
      <Button variant="secondary" label={t.mobileClassroom.shareLink} onPress={() => void Share.share({ message: url })} />
    </View>
  );
}
