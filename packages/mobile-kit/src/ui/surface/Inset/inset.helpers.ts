import { StyleSheet, type ViewStyle } from 'react-native';
import type { CellPlace } from './inset.types';

/** Every group of rows sits in one rounded raised card inside Screen's 16pt gutter. */
export const INSET_RADIUS = 20;

const onlyAt = (at: boolean, size: number) => (at ? size : 0);

/** A virtualised row's slice of the card: the fill, the side edges, the rounded ends. */
export function cellStyle(
  color: { raised: string; rule: string },
  { first, last }: CellPlace,
): ViewStyle {
  const edge = StyleSheet.hairlineWidth;
  const top = onlyAt(first, INSET_RADIUS);
  const bottom = onlyAt(last, INSET_RADIUS);
  return {
    overflow: 'hidden',
    backgroundColor: color.raised,
    borderColor: color.rule,
    borderLeftWidth: edge,
    borderRightWidth: edge,
    borderTopWidth: onlyAt(first, edge),
    borderBottomWidth: onlyAt(last, edge),
    borderTopLeftRadius: top,
    borderTopRightRadius: top,
    borderBottomLeftRadius: bottom,
    borderBottomRightRadius: bottom,
  };
}
