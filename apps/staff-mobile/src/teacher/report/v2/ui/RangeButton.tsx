import { Pressable } from 'react-native';
import { shape, type, useTheme, AppText, Chevron } from '@ab/mobile-kit';

interface RangeButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** A part's range as a field that opens the surah picker. */
export function RangeButton({ label, onPress, disabled }: RangeButtonProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: shape.control.comfort,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: color.ruleInput,
        borderRadius: shape.radius.md,
        backgroundColor: disabled ? color.sunk : color.page,
      }}
    >
      <AppText
        style={{
          flexShrink: 1,
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          color: color.ink,
        }}
      >
        {label}
      </AppText>
      <Chevron to="next" color={color.ink3} />
    </Pressable>
  );
}
