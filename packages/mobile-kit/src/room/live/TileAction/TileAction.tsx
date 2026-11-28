import { Pressable } from 'react-native';
import { useTheme } from '../../../theme';
import type { TileActionProps } from './TileAction.types';

export function TileAction({ label, onPress, icon }: TileActionProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={{
        position: 'absolute',
        top: 6,
        end: 6,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.inverse,
      }}
    >
      {icon(color.onInverse)}
    </Pressable>
  );
}
