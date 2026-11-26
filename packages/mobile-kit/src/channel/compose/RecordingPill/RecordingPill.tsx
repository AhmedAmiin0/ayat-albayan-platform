import { View } from 'react-native';
import { CloseIcon } from '../../../chat-ui/icons/chat-glyphs';
import { mediaTime } from '../../../chat-ui/voice/media-time';
import { RecDot } from '../../../chat-ui/voice/RecDot';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { IconButton } from '../../../ui/primitives/IconButton';
import { Ltr } from '../../../ui/primitives/Ltr';

/** Sending beside the pill stops and sends the recording. */
export function RecordingPill({ ms, onCancel }: { ms: number; onCancel: () => void }) {
  const { color } = useTheme();
  return (
    <View
      testID="channel-recording"
      accessibilityRole="text"
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingStart: 12 }}
    >
      <RecDot />
      <Ltr
        testID="rec-time"
        style={{ fontFamily: type.ui[500], fontSize: type.size.base, color: color.ink }}
      >
        {mediaTime(ms / 1000)}
      </Ltr>
      <View style={{ flex: 1 }} />
      <IconButton label={t.studentChannel.media.cancel} onPress={onCancel}>
        <CloseIcon color={color.bad} />
      </IconButton>
    </View>
  );
}
