import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, useTheme } from '@/theme';
import { Mark } from '@/core/ui/primitives/Mark';
import type { AccountHref } from './AccountRow';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { useMyProfile } from '../hooks/queries';

/**
 * The More screens' header end (R-ACC-05): the user's photo or initials, a 44pt button to «حسابي».
 * Until the profile loads (or without one) the usual gold mark stays.
 */
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
      <Avatar name={profile.full_name} id={profile.id} src={profile.avatar_url} decorative />
    </Pressable>
  );
}
