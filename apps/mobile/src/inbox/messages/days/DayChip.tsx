import { View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/** A day separator (owner 2026-10-27, as WhatsApp): a small centred chip over the day's first message. */
export function DayChip({ label, testID }: { label: string; testID?: string }) {
  const { color } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="header"
      style={{
        alignSelf: 'center',
        marginVertical: 6,
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
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
