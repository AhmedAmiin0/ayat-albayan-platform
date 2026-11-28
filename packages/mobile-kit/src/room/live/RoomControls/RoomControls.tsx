import { View } from 'react-native';
import type { AudioOutput } from '../../model/audio-output';
import { t } from '../../../lib/i18n/i18n';
import { HangUpIcon, RoundButton } from '../../../ui';
import { CameraButton } from '../../preview/CameraButton';
import { MicButton } from '../../preview/MicButton';
import { AudioButton } from '../AudioButton';
import { ChatButton } from '../ChatButton';

interface RoomControlsState {
  micOn: boolean;
  camOn: boolean;
  output: AudioOutput | null;
  /** Null means no chat control in this room. */
  chatUnread: number | null;
}

export interface RoomControlsActions {
  toggleMic: () => void;
  toggleCam: () => void;
  nextOutput: () => void;
  openChat: () => void;
  leave: () => void;
}

interface RoomControlsProps {
  state: RoomControlsState;
  actions: RoomControlsActions;
}

/** docs/35 §3: switch camera sits on one's own tile. */
export function RoomControls({ state, actions }: RoomControlsProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'flex-start',
        paddingTop: 12,
      }}
    >
      <MicButton on={state.micOn} onPress={actions.toggleMic} />
      <CameraButton on={state.camOn} onPress={actions.toggleCam} />
      <AudioButton output={state.output} onPress={actions.nextOutput} />
      {state.chatUnread === null ? null : (
        <ChatButton unread={state.chatUnread} onPress={actions.openChat} />
      )}
      <RoundButton
        label={t.mobileRoom.controls.leave}
        tone="end"
        onPress={actions.leave}
        icon={(ink) => <HangUpIcon color={ink} size={26} />}
      />
    </View>
  );
}
