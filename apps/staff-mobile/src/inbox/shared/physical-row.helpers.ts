// Tests only: a row's children as they land on the screen, physical left → right. RN lays a 'row'
// from the inline-start (the right in Arabic) and a 'row-reverse' from the inline-end.
import type { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

type Host = ReturnType<typeof screen.getByTestId>;

const hosts = (node: Host) => node.children.filter((c): c is Host => typeof c !== 'string');

/** A child's name: its testID, accessibilityLabel or text, else the first one inside it ('?' when none). */
function nameOf(node: Host): string {
  const own: unknown = node.props.testID ?? node.props.accessibilityLabel;
  if (typeof own === 'string') return own;
  const text = node.children.filter((c) => typeof c === 'string').join('');
  if (text) return text;
  return hosts(node).map(nameOf).find((n) => n !== '?') ?? '?';
}

/** Each child's name in the physical order of a row seen under `rtl`. */
export function leftToRight(row: Host, rtl: boolean): string[] {
  const direction = StyleSheet.flatten(row.props.style).flexDirection;
  const names = hosts(row).map(nameOf);
  return (direction === 'row') !== rtl ? names : names.reverse();
}
