import type { ViewStyle } from 'react-native';
import { shape, space } from '../../../theme';

const BOX = space[5];
const EDGE = 2;

/** The kit's box; Material's draws the same 24 dp square with its own edge. */
export function boxStyle(fill: string, edge: string): ViewStyle {
  return {
    width: BOX,
    height: BOX,
    padding: EDGE,
    borderRadius: shape.radius.sm,
    borderWidth: EDGE,
    borderColor: edge,
    backgroundColor: fill,
  };
}
