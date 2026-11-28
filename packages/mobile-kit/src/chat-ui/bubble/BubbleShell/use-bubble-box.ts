import type { ViewStyle } from 'react-native';
import { shape, useTheme } from '../../../theme';
import { bubbleSide } from '../bubble-side';
import type { BubbleShellProps } from './BubbleShell.types';
import { BUBBLE_PAD, edgeOf } from './bubble-shell.helpers';

/** The box: its side, the sharp tail corner at the top of the screen-edge side, its colours. */
export function useBubbleBox(p: BubbleShellProps): ViewStyle {
  const { ours, highlight = false, tail = true, style } = p;
  const { color } = useTheme();
  const side = bubbleSide(ours);
  const corner = side.outer === 'start' ? 'borderTopStartRadius' : 'borderTopEndRadius';
  return {
    alignSelf: side.align,
    maxWidth: '88%',
    gap: 4,
    paddingHorizontal: BUBBLE_PAD.x,
    paddingVertical: BUBBLE_PAD.bottom,
    borderRadius: shape.radius.lg,
    [corner]: tail ? shape.radius.xs : shape.radius.lg,
    borderWidth: 1,
    borderColor: edgeOf(ours, highlight, color),
    backgroundColor: ours ? color.lapisWash : color.raised,
    ...style,
  };
}
