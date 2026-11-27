import type { PressableStateCallbackType, ViewStyle } from 'react-native';

/** The row's fill: the press wash while pressed, else the unread wash (or none). */
export const rowStyle =
  (pressedFill: string, rest: string | undefined) =>
  ({ pressed }: PressableStateCallbackType): ViewStyle => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: pressed ? pressedFill : rest,
  });
