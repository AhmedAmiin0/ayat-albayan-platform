import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { t, shape, useTheme, Mark, Avatar, useMyProfile } from '@ab/mobile-kit';
import type { AccountHref } from './AccountRow';

/** R-ACC-05: until the profile loads, the usual gold mark stays. */
export function AccountHeaderAvatar({ href }: { href: AccountHref }) {
  const { color } = useTheme();
  const profile = useMyProfile().data;
  if (!profile) return <Mark size={28} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.account.mobile.open}
      onPress={() => router.push(href)}
      hitSlop={4}
      style={({ pressed }) => ({
        minWidth: shape.control.touch,
        minHeight: shape.control.touch,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.pill,
        backgroundColor: pressed ? color.sunk : 'transparent',
      })}
    >
      <Avatar
        name={profile.full_name}
        id={profile.avatar_seed ?? profile.id}
        src={profile.avatar_url}
        decorative
      />
    </Pressable>
  );
}
