import type { TextStyle, ViewStyle } from 'react-native';
import { type } from '../../../../theme';

export const frameStyle: ViewStyle = {
  minHeight: 56,
  paddingHorizontal: 16,
  paddingVertical: 10,
  gap: 4,
};

/** 'row' mirrors under RTL, so the switch sits at the end edge in both directions. */
export const lineStyle: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

export const labelStyle = (ink: string): TextStyle => ({
  flexShrink: 1,
  fontFamily: type.ui[600],
  fontSize: type.size.sm,
  color: ink,
});
