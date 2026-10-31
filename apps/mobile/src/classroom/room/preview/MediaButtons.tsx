import { t } from '@/core/lib/i18n/i18n';
import { CameraIcon, CameraOffIcon, MicIcon, MicOffIcon, RoundButton } from '@/inbox';

const C = t.mobileRoom.controls;

interface ToggleProps {
  on: boolean;
  onPress: () => void;
}

/** «كتم»: read out «selected» while muted, like the calls' (docs/28 §5). */
export function MicButton({ on, onPress }: ToggleProps) {
  return (
    <RoundButton
      label={C.mute}
      tone="plain"
      pressed={!on}
      onPress={onPress}
      icon={(ink) => (on ? <MicIcon color={ink} /> : <MicOffIcon color={ink} />)}
    />
  );
}

/** «الكاميرا»: filled while on. */
export function CameraButton({ on, onPress }: ToggleProps) {
  return (
    <RoundButton
      label={C.camera}
      tone="plain"
      pressed={on}
      onPress={onPress}
      icon={(ink) => (on ? <CameraIcon color={ink} /> : <CameraOffIcon color={ink} />)}
    />
  );
}
