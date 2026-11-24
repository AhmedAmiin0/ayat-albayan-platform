import { Pressable } from 'react-native';
import { t, AppText, type, useTheme } from '@ab/mobile-kit';
import { useCorrection } from './correction-context';

/** Its accessible name is its visible text (WCAG 2.5.3); the destination is the hint. */
export function CorrectedMark() {
  const { color } = useTheme();
  const link = useCorrection();
  if (!link) return null;
  return (
    <Pressable
      testID="corrected-mark"
      accessibilityRole="button"
      accessibilityHint={t.inbox.correction.jump}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      onPress={() => link.onJump(link.to)}
    >
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size['2xs'],
          lineHeight: type.lineHeight(type.size['2xs']),
          color: color.lapis,
          textDecorationLine: 'underline',
        }}
      >
        {t.inbox.correction.mark}
      </AppText>
    </Pressable>
  );
}
