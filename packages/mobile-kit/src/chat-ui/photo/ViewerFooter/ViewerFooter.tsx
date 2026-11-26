import type { ReactNode } from 'react';
import { View } from 'react-native';
import { shape, useTheme } from '../../../theme';

export function ViewerFooter({ children }: { children?: ReactNode }) {
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
