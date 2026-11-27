import type { PressableStateCallbackType, ViewStyle } from 'react-native';

export const linkStyle = ({ pressed }: PressableStateCallbackType): ViewStyle => ({
  alignSelf: 'flex-start',
  minHeight: 44,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  borderRadius: 12,
  opacity: pressed ? 0.7 : 1,
});
