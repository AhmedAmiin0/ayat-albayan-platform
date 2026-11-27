import type { PressableStateCallbackType, ViewStyle } from 'react-native';

/** A 52 pt row; the press wash while pressed. */
export const rowStyle =
  (pressedFill: string) =>
  ({ pressed }: PressableStateCallbackType): ViewStyle => ({
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    backgroundColor: pressed ? pressedFill : 'transparent',
  });
