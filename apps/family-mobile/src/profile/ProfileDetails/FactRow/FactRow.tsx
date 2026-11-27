import type { ProfileFact } from '@ab/client-core';
import { View } from 'react-native';
import { AppText, Ltr, type, useTheme } from '@ab/mobile-kit';

/** One fact: its word over its value. A phone, email or code reads left to right. */
export function FactRow({ fact }: { fact: ProfileFact }) {
  const { color } = useTheme();
  // Sized to its text at the inline-start: an LTR island keeps the label's side in RTL.
  const value = {
    alignSelf: 'flex-start' as const,
    fontFamily: type.ui[600],
    fontSize: type.size.body,
    color: color.ink,
  };
  return (
    <View
      accessible
      style={{ minHeight: 56, justifyContent: 'center', gap: 2, paddingHorizontal: 16 }}
    >
      <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>{fact.label}</AppText>
      {fact.ltr ? (
        <Ltr style={value}>{fact.value}</Ltr>
      ) : (
        <AppText style={value}>{fact.value}</AppText>
      )}
    </View>
  );
}
