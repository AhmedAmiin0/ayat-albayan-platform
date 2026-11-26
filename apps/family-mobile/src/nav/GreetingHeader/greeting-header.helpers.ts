import type { PressableStateCallbackType } from 'react-native';

export const ROW = { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 } as const;

export const switchRow = ({ pressed }: PressableStateCallbackType) => ({
  ...ROW,
  minHeight: 48,
  opacity: pressed ? 0.7 : 1,
});
