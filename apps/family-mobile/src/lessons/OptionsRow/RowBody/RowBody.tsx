import { Pressable, View } from 'react-native';
import type { RowBodyProps } from './RowBody.types';
import { Notice } from './Notice';
import { pressedStyle } from './row-body.helpers';

export function RowBody({ open, label, notice, children }: RowBodyProps) {
  if (!open) {
    return (
      <View style={{ flex: 1, gap: 2 }}>
        {children}
        <Notice notice={notice} />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={open}
      style={pressedStyle}
    >
      {children}
      <Notice notice={notice} />
    </Pressable>
  );
}
