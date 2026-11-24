import { Pressable } from 'react-native';
import { t, AppText, shape, type, useTheme } from '@ab/mobile-kit';

interface CustomAmountPillProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

/** Off falls back to the calculator price; used for the payment link and the package price. */
export function CustomAmountPill({ on, onChange }: CustomAmountPillProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={t.paymentLinks.customAmount}
      onPress={() => onChange(!on)}
      hitSlop={{ top: 4, bottom: 4 }}
      style={{
        alignSelf: 'flex-start',
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: on ? color.lapisWash : color.rule,
        backgroundColor: on ? color.lapisWash : color.raised,
      }}
    >
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.sm,
          lineHeight: 22,
          color: on ? color.lapis : color.ink,
        }}
      >
        {t.paymentLinks.customAmount}
      </AppText>
    </Pressable>
  );
}
