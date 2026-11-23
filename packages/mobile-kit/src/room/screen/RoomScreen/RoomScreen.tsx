import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RoomCredentials, RoomPlatform, RoomTarget } from '../../model/room-types';
import { t } from '../../../lib/i18n/i18n';
import { useTheme } from '../../../theme';
import { RoomBody } from '../RoomBody';
import { RoomTopBar } from '../RoomTopBar';
import { useElapsed } from '../use-elapsed';
import { useRoomScreen, type RoomScreenInput } from '../use-room-screen';

export type { RoomChat } from '../use-room-screen';

export interface RoomScreenProps extends RoomScreenInput {
  platform: RoomPlatform;
  target: RoomTarget;
  /** The app's join endpoint (a retry, or no token handed over by the press). */
  fetchJoin: (target: RoomTarget) => Promise<RoomCredentials>;
}

/**
 * A lesson's classroom or a meeting, inside the app (docs/35): the dark cover surface of the calls,
 * a header with the room's name (and, inside, the recording and the people), and the step under it.
 */
export function RoomScreen(props: RoomScreenProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useRoomScreen(props);
  const { session } = screen;
  const elapsed = useElapsed(screen.live ? session.joinedAt : null);
  const live = {
    people: screen.panel.people,
    openPeople: () => screen.openSheet('people'),
    recording: session.snap.recording,
    elapsed,
  };
  return (
    <View
      testID="room-screen"
      style={{ flex: 1, backgroundColor: color.cover, paddingBottom: insets.bottom + 16 }}
    >
      <RoomTopBar
        title={props.target.kind === 'lesson' ? t.classroom.title : t.meetings.internal.item}
        live={screen.live ? live : null}
      />
      <RoomBody screen={screen} platform={props.platform} />
    </View>
  );
}
