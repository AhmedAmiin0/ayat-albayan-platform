import { avatarInitials, avatarTone, avatarTones } from '@ab/shared';
import { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { type, useTheme, type Theme } from '@/theme';
import { AppText } from './AppText';

/** sm 28 (schedule rows), md 36 (lists, headers), lg 64 (a person's page), xl 96 (the call screens), as on the web. */
type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const DIAMETER: Record<AvatarSize, number> = { sm: 28, md: 36, lg: 64, xl: 96 };

/** The web's person glyph (icon `teacher`, 20 grid): a head and shoulders, for a name with no letter. */
const PERSON = 'M13 6.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 16.5c1.1-2.9 3.3-4.3 6-4.3s4.9 1.4 6 4.3';

interface AvatarProps {
  /** The person's name: the initials and the accessible name. */
  name: string;
  /** The tone seed (the person's id), so one person keeps one colour on every screen; falls back to the name. */
  id?: string | null;
  /** The photo (a short-lived signed URL or a local preview); null/absent shows the initials. */
  src?: string | null;
  size?: AvatarSize;
  /** In a row that already reads the name: hidden from the screen reader (no double read). */
  decorative?: boolean;
}

/** The hairline around the circle (web: an inset 1px rule): rule-strong, the more visible rule-input in dark. */
const frameOf = (theme: Theme, d: number) => ({
  width: d,
  height: d,
  borderRadius: d / 2,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: theme.name === 'dark' ? theme.color.ruleInput : theme.color.ruleStrong,
});

function PersonGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg testID="avatar-glyph" viewBox="0 0 20 20" width={size} height={size} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d={PERSON} />
    </Svg>
  );
}

/** The initials (lg/xl in the display face, as on the web), or the person glyph when the name has no letter. */
function Letters({ name, size, theme }: { name: string; size: AvatarSize; theme: Theme }) {
  const d = DIAMETER[size];
  const letters = avatarInitials(name);
  if (!letters) return <PersonGlyph size={Math.round(d * 0.55)} color={theme.color.ink2} />;
  const fontSize = Math.max(type.size['2xs'], Math.round(d * 0.4));
  const fontFamily = size === 'lg' || size === 'xl' ? type.display : type.ui[700];
  return (
    <AppText numberOfLines={1} style={{ fontFamily, fontSize, lineHeight: Math.round(fontSize * 1.6), color: theme.color.ink }}>
      {letters}
    </AppText>
  );
}

/**
 * The one avatar (owner 2026-10-28): a staff member's photo in a round frame, else their initials on
 * the person's own tone (shared avatarTones, ink text, AA in both themes), a hairline around both. Fixed
 * size either way, so a photo that loads or fails never moves the row; a photo that fails falls back to
 * the initials, a name with no letter shows the person glyph.
 */
export const Avatar = memo(function Avatar({ name, id, src, size = 'md', decorative = false }: AvatarProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState<string | null>(null);
  const frame = frameOf(theme, DIAMETER[size]);
  const a11y = decorative
    ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: name };
  if (src && failed !== src) {
    return (
      <Image
        {...a11y}
        source={{ uri: src }}
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        onError={() => setFailed(src)}
        testID="avatar-photo"
        style={[frame, { backgroundColor: theme.color.sunk }]}
      />
    );
  }
  const tones = avatarTones[theme.name];
  const background = tones[avatarTone(id || name)] ?? tones[0];
  return (
    <View {...a11y} testID="avatar-initials" style={[frame, { backgroundColor: background, alignItems: 'center', justifyContent: 'center' }]}>
      <Letters name={name} size={size} theme={theme} />
    </View>
  );
});
