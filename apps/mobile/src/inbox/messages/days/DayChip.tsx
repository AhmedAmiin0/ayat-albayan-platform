import { View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { CHIP_BORDER, CHIP_MARGIN, CHIP_PAD } from './top-band';

/** A day separator (owner 2026-10-27, as WhatsApp): a small centred chip over the day's first message. */
export function DayChip({ label, testID }: { label: string; testID?: string }) {
  const { color } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="header"
      style={{
        alignSelf: 'center',
        marginVertical: CHIP_MARGIN,
        paddingHorizontal: 12,
        paddingVertical: CHIP_PAD,
        borderRadius: shape.radius.pill,
        borderWidth: CHIP_BORDER,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <AppText
        style={{ fontFamily: type.ui[600], fontSize: type.size['2xs'], lineHeight: type.lineHeight(type.size['2xs']), color: color.ink2 }}
      >
        {label}
      </AppText>
    </View>
  );
}
