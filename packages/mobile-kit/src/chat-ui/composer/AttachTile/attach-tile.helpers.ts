import type { PressableStateCallbackType } from 'react-native';

export const tileStyle = ({ pressed }: PressableStateCallbackType) =>
  ({
    width: '33.333%',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    opacity: pressed ? 0.7 : 1,
  }) as const;
