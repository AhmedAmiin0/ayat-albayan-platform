import { avatarInitials, avatarTone, avatarTones } from '@ab/shared';
import { memo, useState } from 'react';
import { Image, View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from './AppText';

/** sm 28 (schedule rows), md 36 (lists, headers), lg 64 (a person's page), xl 112 (the call screens). */
type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const DIAMETER: Record<AvatarSize, number> = { sm: 28, md: 36, lg: 64, xl: 112 };

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

/**
 * The one avatar (owner 2026-10-28): a staff member's photo in a round frame, else their initials on
 * the person's own tone (shared avatarTones, ink text, AA in both themes). Fixed size either way, so a
 * photo that loads or fails never moves the row; a photo that fails falls back to the initials.
 */
export const Avatar = memo(function Avatar({ name, id, src, size = 'md', decorative = false }: AvatarProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState<string | null>(null);
  const d = DIAMETER[size];
  const frame = { width: d, height: d, borderRadius: d / 2 };
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
  const fontSize = Math.max(type.size['2xs'], Math.round(d * 0.4));
  return (
    <View
      {...a11y}
      testID="avatar-initials"
      style={[frame, { backgroundColor: background, alignItems: 'center', justifyContent: 'center' }]}
    >
      <AppText
        numberOfLines={1}
        style={{ fontFamily: type.ui[700], fontSize, lineHeight: Math.round(fontSize * 1.6), color: theme.color.ink }}
      >
        {avatarInitials(name)}
      </AppText>
    </View>
  );
});
