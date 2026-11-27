import type { PressableStateCallbackType, ViewStyle } from 'react-native';

export const pressStyle = ({ pressed }: PressableStateCallbackType): ViewStyle => ({
  flex: 1,
  height: 54,
  alignItems: 'center',
  justifyContent: 'center',
  opacity: pressed ? 0.6 : 1,
  transform: [{ scale: pressed ? 0.96 : 1 }],
});
