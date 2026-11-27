import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Avatar, Chevron, t, type, useTheme } from '@ab/mobile-kit';
import { PROFILE_HREF } from '@/nav';
import { PressCard } from '@/ui';
import type { ProfileCardProps } from './ProfileCard.types';

export function ProfileCard({ name, line, photo, seed }: ProfileCardProps) {
  const { color } = useTheme();
  return (
    <PressCard
      label={`${name} ${line}`}
      hint={t.portal.app.profile.open}
      onPress={() => router.push(PROFILE_HREF)}
      style={{ flexDirection: 'row', alignItems: 'center' }}
    >
      <Avatar name={name} id={seed} src={photo} size="lg" decorative />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink }}>
          {name}
        </AppText>
        <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>{line}</AppText>
      </View>
      <Chevron to="next" color={color.ink3} />
    </PressCard>
  );
}
