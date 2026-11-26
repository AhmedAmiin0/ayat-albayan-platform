import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { AudioOutput } from '../../model/audio-output';
import type { RoomPlatform, RoomSnapshot } from '../../model/room-types';
import { t } from '../../../lib/i18n/i18n';
import { AppText, Notice } from '../../../ui';
import { type, useTheme } from '../../../theme';
import { ParticipantGrid } from '../ParticipantGrid';
import { RoomControls, type RoomControlsActions } from '../RoomControls';

interface LiveControls extends RoomControlsActions {
  output: AudioOutput | null;
  front: boolean;
  switchCamera: () => void;
  /** The microphone was turned off by the teacher. */
  mutedByStaff: boolean;
}

interface RoomLiveProps {
  snap: RoomSnapshot;
  Video: RoomPlatform['Video'];
  controls: LiveControls;
  /** Null means no chat control. */
  chatUnread: number | null;
  /** The panel over the foot: the participants, the leave question, the chat notice. */
  sheet: ReactNode;
}

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
