import { Pressable } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Chevron } from '@/core/ui/primitives/Chevron';

interface RangeButtonProps {
  /** «سورة الملك · الآيات 1–15», or «اختر السورة والآيات» on an empty part. */
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
