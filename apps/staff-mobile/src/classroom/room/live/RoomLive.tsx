import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { AudioOutput } from '@/classroom/room/model/audio-output';
import type { RoomPlatform, RoomSnapshot } from '@/classroom/room/model/room-types';
import { t, AppText, Notice, type, useTheme } from '@ab/mobile-kit';
import { ParticipantGrid } from './ParticipantGrid';
import { RoomControls, type RoomControlsActions } from './RoomControls';

interface LiveControls extends RoomControlsActions {
  output: AudioOutput | null;
  front: boolean;
  switchCamera: () => void;
  /** The microphone went off by the teacher's hand: «كتمك المعلم». */
  mutedByStaff: boolean;
}

interface RoomLiveProps {
  snap: RoomSnapshot;
  Video: RoomPlatform['Video'];
  controls: LiveControls;
  /** «المحادثة»'s unread count; null = no chat control. */
  chatUnread: number | null;
  /** The panel over the foot: the participants, the leave question, the chat notice. */
  sheet: ReactNode;
}

/**
 * In the room: «جارٍ إعادة الاتصال…» while LiveKit reconnects, «كتمك المعلم» (canvas RoomXNotice),
 * the grid, and the controls.
 */
export function RoomLive({ snap, Video, controls, chatUnread, sheet }: RoomLiveProps) {
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
      {controls.mutedByStaff ? (
        <View style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
          <Notice message={`${t.classroom.mute.byStaff}\n${t.mobileRoom.mutedHint}`} />
        </View>
      ) : null}
      <ParticipantGrid tiles={snap.tiles} Video={Video} actions={controls} />
      <RoomControls
        state={{ micOn: snap.micOn, camOn: snap.camOn, output: controls.output, chatUnread }}
        actions={controls}
      />
      {sheet}
    </View>
  );
}
