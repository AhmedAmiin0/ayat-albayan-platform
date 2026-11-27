import { View } from 'react-native';
import { AppText, Avatar, raisedCard, shape, type, useTheme } from '@ab/mobile-kit';
import type { ProfileHeroProps } from './ProfileHero.types';

/** The profile's head: the photo or initials in a gold ring, the name, who signed in. */
export function ProfileHero({ name, line, photo, seed }: ProfileHeroProps) {
  const { color } = useTheme();
  const nameSize = type.size.h3;
  return (
    <View
      style={{
        ...raisedCard(color, 20),
        alignItems: 'center',
        gap: 8,
        paddingVertical: 24,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          padding: 4,
          borderRadius: shape.radius.pill,
          borderWidth: 2,
          borderColor: color.goldSoft,
        }}
      >
        <Avatar name={name} id={seed} src={photo} size="xl" decorative />
      </View>
      <AppText
        accessibilityRole="header"
        style={{
          fontFamily: type.display,
          fontSize: nameSize,
          lineHeight: type.lineHeight(nameSize, true),
          color: color.ink,
          textAlign: 'center',
        }}
      >
        {name}
      </AppText>
      <AppText style={{ fontSize: type.size.sm, color: color.ink2, textAlign: 'center' }}>
        {line}
      </AppText>
    </View>
  );
}
