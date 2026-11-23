import { router } from 'expo-router';
import { View } from 'react-native';
import { AppText, Avatar, Chevron, t, type, useTheme } from '@ab/mobile-kit';
import { PROFILE_HREF } from '#/nav/index.ts';
import { PressCard } from '#/ui/index.ts';

interface ProfileCardProps {
  name: string;
  /** «ولي أمر» or «طالب · رمز الطالب AB-2041». */
  line: string;
  /** The signed photo URL, else null (the initials), as on the profile page. */
  photo: string | null;
  /** A student's id (their home card's tone), else null (the name). */
  seed: string | null;
}

/** «حسابي»'s head (canvas Account): the avatar, the name and who signed in → the profile page. */
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
