import type { PressableStateCallbackType, ViewStyle } from 'react-native';

/** The row in view, and any row while pressed, sits on the lapis wash. */
export const rowStyle =
  (wash: string, current: boolean) =>
  ({ pressed }: PressableStateCallbackType): ViewStyle => ({
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: current || pressed ? wash : undefined,
  });
