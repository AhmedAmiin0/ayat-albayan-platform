import { Pressable } from 'react-native';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../primitives/AppText';
import { retryPressStyle } from './retry-button.helpers';
import type { RetryButtonProps } from './RetryButton.types';

export function RetryButton({ label, onPress, fontFamily }: RetryButtonProps) {
  const { color } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={retryPressStyle(color)}>
      <AppText
        style={{
          color: color.onLapis,
          fontFamily,
          fontSize: type.size.base,
          lineHeight: type.lineHeight(type.size.base),
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
