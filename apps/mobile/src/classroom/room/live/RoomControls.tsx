import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { HangUpIcon, PhoneIcon, RoundButton, SpeakerIcon, SwitchCameraIcon } from '@/inbox';
import { CameraButton, MicButton } from '@/classroom/room/preview/MediaButtons';

interface RoomControlsState {
  micOn: boolean;
  camOn: boolean;
  speaker: boolean;
}

export interface RoomControlsActions {
  toggleMic: () => void;
  toggleCam: () => void;
  switchCamera: () => void;
  toggleSpeaker: () => void;
  leave: () => void;
}

interface RoomControlsProps {
  state: RoomControlsState;
  actions: RoomControlsActions;
}

const C = t.mobileRoom.controls;

/**
 * The in-room row, the calls' round buttons (docs/35 §3): كتم, الكاميرا, تبديل, مكبر الصوت /
 * السماعة, غادر.
 */
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
      {state.camOn ? (
        <RoundButton
          label={C.switchCamera}
          tone="plain"
          onPress={actions.switchCamera}
          icon={(ink) => <SwitchCameraIcon color={ink} />}
        />
      ) : null}
      <RoundButton
        label={state.speaker ? C.speaker : C.earpiece}
        tone="plain"
        pressed={state.speaker}
        onPress={actions.toggleSpeaker}
        icon={(ink) => (state.speaker ? <SpeakerIcon color={ink} /> : <PhoneIcon color={ink} />)}
      />
      <RoundButton
        label={C.leave}
        tone="end"
        onPress={actions.leave}
        icon={(ink) => <HangUpIcon color={ink} size={26} />}
      />
    </View>
  );
}
