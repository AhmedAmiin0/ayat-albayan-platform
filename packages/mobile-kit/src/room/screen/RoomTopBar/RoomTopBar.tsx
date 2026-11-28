import { View } from 'react-native';
import { AppText } from '../../../ui';
import { type, useTheme } from '../../../theme';
import { PeoplePill } from '../PeoplePill';
import { RecordingPill } from '../RecordingPill';
import type { RoomTopBarProps } from './RoomTopBar.types';
import { useRoomTopBar } from './use-room-top-bar';

/** Open in browser lives in the panel and pre-room steps since it overflowed 358pt. */
export function RoomTopBar({ title, live }: RoomTopBarProps) {
  const { color } = useTheme();
  const { insets } = useRoomTopBar();
  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <AppText
          accessibilityRole="header"
          numberOfLines={1}
          style={{ fontSize: type.size.base, color: color.coverInk }}
        >
          {title}
        </AppText>
        {live?.recording ? <RecordingPill elapsed={live.elapsed} /> : null}
      </View>
      {live ? <PeoplePill people={live.people} onPress={live.openPeople} /> : null}
    </View>
  );
}
