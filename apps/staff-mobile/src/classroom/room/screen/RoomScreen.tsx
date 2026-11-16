import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RoomCredentials, RoomPlatform, RoomTarget } from '@/classroom/room/model/room-types';
import { fetchJoin as apiJoin } from '@/classroom/room/state/fetch-join';
import { t, useTheme } from '@ab/mobile-kit';
import { RoomBody } from './RoomBody';
import { RoomTopBar } from './RoomTopBar';
import { useRoomScreen, type RoomScreenInput } from './use-room-screen';

export type { RoomChat } from './use-room-screen';

export interface RoomScreenProps extends Omit<RoomScreenInput, 'fetchJoin'> {
  platform: RoomPlatform;
  target: RoomTarget;
  /** Tests inject the join; the app posts the room's join endpoint. */
  fetchJoin?: (target: RoomTarget) => Promise<RoomCredentials>;
}

/**
 * A lesson's classroom or a meeting, inside the app (docs/35): the dark cover surface of the calls,
 * a header with «فتح في المتصفح» on every step, and the session's step under it.
 */
export function RoomScreen({ fetchJoin = apiJoin, ...props }: RoomScreenProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useRoomScreen({ ...props, fetchJoin });
  const { session } = screen;
  const count = screen.panel.people.length;
  return (
    <View
      testID="room-screen"
      style={{ flex: 1, backgroundColor: color.cover, paddingBottom: insets.bottom + 16 }}
    >
      <RoomTopBar
        title={props.target.kind === 'lesson' ? t.classroom.title : t.meetings.internal.item}
        people={screen.live ? { count, open: () => screen.openSheet('people') } : null}
        recording={screen.live && session.snap.recording}
        onBrowser={screen.browser}
      />
      <RoomBody screen={screen} platform={props.platform} />
    </View>
  );
}
