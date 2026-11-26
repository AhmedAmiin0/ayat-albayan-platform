import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RoomTile } from '../../model/room-types';
import { AppText } from '../../../ui';
import { type, useTheme } from '../../../theme';
import { PeoplePill } from '../PeoplePill';
import { RecordingPill } from '../RecordingPill';

interface LiveHeader {
  people: readonly RoomTile[];
  openPeople: () => void;
  recording: boolean;
  /** «04:12» since one joined. */
  elapsed: string | null;
}

interface RoomTopBarProps {
  title: string;
  /** In the room only: the recording notice and the people pill. */
  live: LiveHeader | null;
}

/** Open in browser lives in the panel and pre-room steps since it overflowed 358pt. */
export function RoomTopBar({ title, live }: RoomTopBarProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
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
