import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { useTheme } from '../../../theme';
import { RoomBody } from '../RoomBody';
import { RoomTopBar } from '../RoomTopBar';
import type { RoomScreenProps } from './RoomScreen.types';
import { useRoomScreen } from './use-room-screen';

/**
 * A lesson's classroom or a meeting, inside the app (docs/35): the dark cover surface of the calls,
 * a header with the room's name (and, inside, the recording and the people), and the step under it.
 */
export function RoomScreen(props: RoomScreenProps) {
  const { color } = useTheme();
  const { insets, screen, live } = useRoomScreen(props);
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
