import { shape, type Palette } from '../../../theme';

const PAD_X = 12;
const PAD_Y = 8;
/** The rule edge plus its padding: the ring grows inward, so the text never moves. */
const INSET = 1;

export const fieldPad = { x: PAD_X, y: PAD_Y };

/** The native input's box: a 2pt ring replaces the 1pt edge and takes that point of padding. */
export function nativeBox(color: Palette, focused: boolean) {
  const edge = focused ? 2 : 1;
  return {
    paddingHorizontal: PAD_X + INSET - edge,
    paddingVertical: PAD_Y + INSET - edge,
    borderWidth: edge,
    borderColor: focused ? color.lapis : color.ruleInput,
    borderRadius: shape.radius.md,
    backgroundColor: color.raised,
  };
}

/** SwiftUI frames the text inside its padding and border: what is left of the 44pt touch size. */
export const innerMinHeight = shape.control.touch - 2 * (PAD_Y + INSET);
