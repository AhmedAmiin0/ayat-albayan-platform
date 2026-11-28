import type { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { z } from 'zod';

type Host = ReturnType<typeof screen.getByTestId>;

const flatStyle = z.record(z.string(), z.unknown()).default({});

/** One value of a host node's flattened style, for tests that check a single style prop. */
export function styleProp(node: Host, key: string): unknown {
  const flat: unknown = StyleSheet.flatten(node.props.style);
  return flatStyle.parse(flat)[key];
}
