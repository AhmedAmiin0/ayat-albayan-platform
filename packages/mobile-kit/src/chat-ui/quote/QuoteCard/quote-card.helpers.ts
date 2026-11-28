import type { PressableStateCallbackType } from 'react-native';
import { QUOTE_BOX } from '../quote-style';

/** The card's box: the bar in its tone, and the wash only while pressed. */
export const quoteBox =
  (bar: string, wash: { rest: string; pressed: string }) =>
  ({ pressed }: PressableStateCallbackType) => ({
    ...QUOTE_BOX,
    borderStartColor: bar,
    backgroundColor: pressed ? wash.pressed : wash.rest,
  });
