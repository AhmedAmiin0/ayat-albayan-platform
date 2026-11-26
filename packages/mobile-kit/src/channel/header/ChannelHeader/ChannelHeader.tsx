import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { type, useTheme } from '../../../theme';
import { BackButton } from '../../../ui/navigation/BackButton';
import { AppText } from '../../../ui/primitives/AppText';
import { Avatar } from '../../../ui/primitives/Avatar';
import type { ChannelRef } from '../../channel-api';
import { ChannelPresenceLine } from '../../ChannelPresenceLine';

interface ChannelHeaderProps {
  refs: ChannelRef;
  title: string;
  /** Whose initials the avatar shows (the student, or the family's first other speaker). */
  avatarName: string;
  /** The viewer is listed last; empty while nothing is loaded. */
  names: string;
  trailing?: ReactNode;
}

/** Presence shows only when allowed. */
export function ChannelHeader(props: ChannelHeaderProps) {
  const { refs, title, avatarName, names, trailing } = props;
  const { color } = useTheme();
  const small = {
    fontFamily: type.ui[500],
    fontSize: type.size['2xs'],
    lineHeight: type.lineHeight(type.size['2xs']),
    color: color.ink2,
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 52 }}>
      <View style={{ marginStart: -10 }}>
        <BackButton onPress={() => router.back()} />
      </View>
      <Avatar name={avatarName} decorative />
      <View style={{ flex: 1, minWidth: 0, paddingStart: 6 }}>
        <AppText
          accessibilityRole="header"
          numberOfLines={1}
          style={{
            fontFamily: type.display,
            fontSize: type.size.h4,
            lineHeight: type.lineHeight(type.size.h4, true),
            color: color.ink,
          }}
        >
          {title}
        </AppText>
        {names ? (
          <AppText testID="channel-people" numberOfLines={1} style={small}>
            {names}
          </AppText>
        ) : null}
        <ChannelPresenceLine refs={refs} />
      </View>
      {trailing}
    </View>
  );
}
