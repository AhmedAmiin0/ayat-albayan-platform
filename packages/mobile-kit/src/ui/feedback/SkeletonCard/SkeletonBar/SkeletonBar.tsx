import { View } from 'react-native';
import { shape, useTheme } from '../../../../theme';
import type { SkeletonBarProps } from './SkeletonBar.types';

export function SkeletonBar({ width }: SkeletonBarProps) {
  const { color } = useTheme();
  return (
    <View
      style={{ width, height: 12, borderRadius: shape.radius.sm, backgroundColor: color.sunk }}
    />
  );
}
