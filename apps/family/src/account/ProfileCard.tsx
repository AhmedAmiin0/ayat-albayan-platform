import { View } from 'react-native';
import { AppText, Avatar, raisedCard, type, useTheme } from '@ab/mobile-kit';

interface ProfileCardProps {
  name: string;
  /** «ولي أمر» or «طالب · رمز الطالب AB-2041». */
  line: string;
}

/** «حسابي»'s head (canvas Account): the avatar, the name and who signed in. */
export function ProfileCard({ name, line }: ProfileCardProps) {
  const { color } = useTheme();
  return (
    <View
      style={{
        ...raisedCard(color, 16),
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
      }}
    >
      <Avatar name={name} size="lg" decorative />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink }}>
          {name}
        </AppText>
        <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>{line}</AppText>
      </View>
    </View>
  );
}
