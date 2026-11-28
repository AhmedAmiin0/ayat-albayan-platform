import type { PressableStateCallbackType } from 'react-native';
import { shape } from '../../../theme';

export const GRID = { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' } as const;

/** A 44 pt cell that takes the wash only while pressed. */
export const emojiCell =
  (wash: string) =>
  ({ pressed }: PressableStateCallbackType) => ({
    width: shape.control.touch,
    height: shape.control.touch,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: shape.radius.md,
    backgroundColor: pressed ? wash : 'transparent',
  });
