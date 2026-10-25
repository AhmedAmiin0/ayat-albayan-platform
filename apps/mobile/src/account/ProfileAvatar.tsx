import { initialsOf } from '@ab/shared';
import { Image, View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

export interface ProfileAvatarProps {
  name: string;
  /** The photo (signed URL or a local preview); null shows the initials. */
  uri: string | null;
  /** Diameter in pt. */
  size?: number;
}

/**
 * R-ACC-05: the user's photo in a round frame, or their initials on the gold wash (docs/07:
 * avatars are the one round thing besides chips). The photo is announced «صورة {name}».
 */
export function ProfileAvatar({ name, uri, size = 40 }: ProfileAvatarProps) {
  const { color } = useTheme();
  const frame = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1,
    borderColor: color.gold,
    backgroundColor: color.goldWash,
  };
  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityRole="image"
        accessibilityLabel={t.account.avatar.alt.replace('{name}', name)}
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        testID="profile-avatar-photo"
        style={frame}
      />
    );
  }
  const fontSize = Math.max(type.size['2xs'], Math.round(size * 0.4));
  return (
    <View
      testID="profile-avatar-initials"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[frame, { alignItems: 'center', justifyContent: 'center' }]}
    >
      <AppText style={{ fontFamily: type.ui[700], fontSize, lineHeight: Math.round(fontSize * 1.6), color: color.ink }}>
        {initialsOf(name)}
      </AppText>
    </View>
  );
}
