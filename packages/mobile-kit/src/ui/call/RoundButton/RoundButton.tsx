import { Pressable, View } from 'react-native';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../primitives/AppText';
import type { RoundButtonProps } from './RoundButton.types';
import { useRoundButton } from './use-round-button';

/** A call control (WhatsApp's round buttons): a 64pt circle and its word under it. */
export function RoundButton({ label, tone, onPress, pressed, icon, ...a11y }: RoundButtonProps) {
  const { color } = useTheme();
  const { ink, selected, pressStyle } = useRoundButton({ tone, pressed });
  return (
    <View style={{ alignItems: 'center', gap: 8, minWidth: 72 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y.accessibilityLabel ?? label}
        accessibilityState={selected}
        onPress={onPress}
        style={pressStyle}
      >
        {icon(ink)}
      </Pressable>
      <AppText
        importantForAccessibility="no"
        style={{
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.coverInk,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}
