import { Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { roomWebUrl } from '@/classroom/room/model/join-target';
import type { RoomCredentials, RoomPlatform, RoomTarget } from '@/classroom/room/model/room-types';
import { fetchJoin as apiJoin } from '@/classroom/room/state/fetch-join';
import { useRoomSession } from '@/classroom/room/state/use-room-session';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { RoomBody } from './RoomBody';
import { RoomTopBar } from './RoomTopBar';

interface RoomScreenProps {
  platform: RoomPlatform;
  target: RoomTarget;
  /** Close the screen (the route goes back). */
  onExit: () => void;
  /** Tests inject the join; the app posts the room's join endpoint. */
  fetchJoin?: (target: RoomTarget) => Promise<RoomCredentials>;
}

/**
 * A lesson's classroom or a meeting, inside the app (docs/35): the dark cover surface of the calls,
 * a header with «فتح في المتصفح» on every step, and the session's step under it.
 */
export function RoomScreen({ platform, target, onExit, fetchJoin = apiJoin }: RoomScreenProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useRoomSession({ platform, target, fetchJoin });
  const leave = () => {
    session.leave();
    onExit();
  };
  const browser = () => {
    leave();
    void Linking.openURL(roomWebUrl(target));
  };
  const live = session.phase.step === 'live';
  const others = session.snap.tiles.filter((x) => !x.screen).length;
  return (
    <View
      testID="room-screen"
      style={{ flex: 1, backgroundColor: color.cover, paddingBottom: insets.bottom + 16 }}
    >
      <RoomTopBar
        title={target.kind === 'lesson' ? t.classroom.title : t.meetings.internal.item}
        subtitle={live ? t.mobileRoom.count.replace('{n}', String(others)) : null}
        onBrowser={browser}
      />
      <RoomBody session={session} platform={platform} onLeave={leave} onBack={onExit} />
    </View>
  );
}
