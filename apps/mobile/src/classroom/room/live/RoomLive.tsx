import { View } from 'react-native';
import type { RoomPlatform, RoomSnapshot } from '@/classroom/room/model/room-types';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { ParticipantGrid } from './ParticipantGrid';
import { RoomControls, type RoomControlsActions } from './RoomControls';

interface RoomLiveProps {
  snap: RoomSnapshot;
  Video: RoomPlatform['Video'];
  controls: RoomControlsActions & { speaker: boolean; front: boolean };
}

/** In the room: «جارٍ إعادة الاتصال…» while LiveKit reconnects, the grid, and the controls. */
export function RoomLive({ snap, Video, controls }: RoomLiveProps) {
  const { color } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      {snap.status === 'reconnecting' ? (
        <AppText
          testID="room-reconnecting"
          accessibilityLiveRegion="polite"
          style={{
            textAlign: 'center',
            fontSize: type.size.sm,
            color: color.onBad,
            backgroundColor: color.badSolid,
            paddingVertical: 6,
          }}
        >
          {t.classroom.reconnecting}
        </AppText>
      ) : null}
      <ParticipantGrid tiles={snap.tiles} Video={Video} front={controls.front} />
      <RoomControls
        state={{ micOn: snap.micOn, camOn: snap.camOn, speaker: controls.speaker }}
        actions={controls}
      />
    </View>
  );
}
