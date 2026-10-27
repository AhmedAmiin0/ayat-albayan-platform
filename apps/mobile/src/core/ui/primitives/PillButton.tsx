import { Pressable } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from './AppText';
import { pressScale } from './Button';

interface PillButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * A 36pt secondary pill for a strip of actions over a chat (docs/07 §6, dense). The hit area is
 * stretched to 44pt by hitSlop, so it is as easy to press as a full Button.
 */
export function PillButton({ label, onPress, accessibilityLabel }: PillButtonProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => ({
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: color.ruleInput,
        backgroundColor: pressed ? color.sunk : color.raised,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressScale(pressed, false) }],
      })}
    >
      <AppText
        numberOfLines={1}
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.ink,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
