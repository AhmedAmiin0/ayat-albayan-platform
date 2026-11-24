import { t } from '../../lib/i18n/i18n';
import { CallCameraIcon, CameraOffIcon, CallMicIcon, MicOffIcon, RoundButton } from '../../ui';

const C = t.mobileRoom.controls;

interface ToggleProps {
  on: boolean;
  onPress: () => void;
}

/** Read out as selected while muted, like calls (docs/28 §5). */
export function MicButton({ on, onPress }: ToggleProps) {
  return (
    <RoundButton
      label={C.mute}
      tone="plain"
      pressed={!on}
      onPress={onPress}
      icon={(ink) => (on ? <CallMicIcon color={ink} /> : <MicOffIcon color={ink} />)}
    />
  );
}

export function CameraButton({ on, onPress }: ToggleProps) {
  return (
    <RoundButton
      label={C.camera}
      tone="plain"
      pressed={on}
      onPress={onPress}
      icon={(ink) => (on ? <CallCameraIcon color={ink} /> : <CameraOffIcon color={ink} />)}
    />
  );
}
