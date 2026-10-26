import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/** The first letter of each of the first two words: «أحمد علي» → «أع»; «?» for a blank name. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => Array.from(w)[0] ?? '').join('') || '?';
}

/** The call screen's big avatar (WhatsApp's): initials on the gold wash; decorative, the name is read. */
export function Initials({ name, size = 112 }: { name: string; size?: number }) {
  const { color } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: color.gold, backgroundColor: color.goldWash, alignItems: 'center', justifyContent: 'center' }}
    >
      <AppText style={{ fontFamily: type.ui[700], fontSize: size * 0.36, lineHeight: size * 0.5, color: color.ink }}>{initialsOf(name)}</AppText>
    </View>
  );
}
