import type { ComponentType } from 'react';
import { View } from 'react-native';

const gaps = new Map<number, ComponentType>();

/** FlashList lays rows out itself (no `gap`): one stable spacer component per size. */
export function gapOf(size: number): ComponentType {
  const known = gaps.get(size);
  if (known) return known;
  const Gap = () => <View style={{ height: size }} />;
  gaps.set(size, Gap);
  return Gap;
}
