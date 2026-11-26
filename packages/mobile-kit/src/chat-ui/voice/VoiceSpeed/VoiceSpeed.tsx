import { Pressable } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { shape, type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { useSmallText } from '../../bubble/use-small-text';
import { type Rate, rateLabel } from '../voice-math';

/** The voice note's speed chip («1×» → «1.5×» → «2×»), once playback has started. */
export function VoiceSpeed({ rate, onPress }: { rate: Rate; onPress: () => void }) {
  const { color } = useTheme();
  const small = useSmallText();
  return (
    <Pressable
      testID="voice-speed"
      accessibilityRole="button"
      accessibilityLabel={t.inbox.playbackSpeed.replace('{rate}', rateLabel(rate))}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={{
        minHeight: 24,
        minWidth: 40,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.pill,
        backgroundColor: color.lapisFill,
      }}
    >
      <AppText style={{ ...small, fontFamily: type.ui[600], color: color.onLapis }}>
        {rateLabel(rate)}
      </AppText>
    </Pressable>
  );
}
