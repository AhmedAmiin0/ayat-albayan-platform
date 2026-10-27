import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/** One letter, the name's first (two joined Arabic letters read as a word): «أحمد علي» → «أ»; «?» for a blank name. */
export function initialOf(name: string): string {
  return Array.from(name.trim())[0] ?? '?';
}

/** The call screen's big avatar (WhatsApp's): the initial on the gold wash; decorative, the name is read. */
export function Initials({ name, size = 112 }: { name: string; size?: number }) {
  const { color } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: color.gold, backgroundColor: color.goldWash, alignItems: 'center', justifyContent: 'center' }}
    >
      <AppText style={{ fontFamily: type.ui[700], fontSize: size * 0.36, lineHeight: size * 0.5, color: color.ink }}>{initialOf(name)}</AppText>
    </View>
  );
}

/** The caller's name under the avatar, the screen's heading (one line, the display face). */
export function CallerName({ name }: { name: string }) {
  const { color } = useTheme();
  return (
    <AppText
      accessibilityRole="header"
      numberOfLines={1}
      style={{ fontFamily: type.display, fontSize: type.size.h3, lineHeight: type.lineHeight(type.size.h3, true), color: color.coverInk }}
    >
      {name}
    </AppText>
  );
}
