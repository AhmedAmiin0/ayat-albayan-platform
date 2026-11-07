import { Pressable } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { useCorrection } from './correction-context';

/**
 * «صُحِّحت» beside a corrected original's time (owner 2026-11-07): a tap goes to the correction,
 * as a quote's tap goes to its original. Nothing on any other bubble. Its name is its visible
 * text (WCAG 2.5.3); where it goes is the hint.
 */
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
