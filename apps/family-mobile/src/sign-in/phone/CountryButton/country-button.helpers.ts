import type { PressableStateCallbackType, ViewStyle } from 'react-native';

/** The button's edge beside the number, and the press wash while pressed. */
export const buttonStyle =
  (edge: string, pressedFill: string) =>
  ({ pressed }: PressableStateCallbackType): ViewStyle => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderEndWidth: 1,
    borderEndColor: edge,
    backgroundColor: pressed ? pressedFill : 'transparent',
  });
