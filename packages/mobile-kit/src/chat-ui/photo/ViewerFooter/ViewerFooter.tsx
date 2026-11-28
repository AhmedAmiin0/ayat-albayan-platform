import { View } from 'react-native';
import { shape, useTheme } from '../../../theme';
import type { ViewerFooterProps } from './ViewerFooter.types';

export function ViewerFooter({ children }: ViewerFooterProps) {
  const { color } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <View
        style={{
          paddingHorizontal: 16,
          borderRadius: shape.radius.lg,
          backgroundColor: color.raised,
        }}
      >
        {children}
      </View>
    </View>
  );
}
