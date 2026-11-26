import type { ReactNode } from 'react';
import type { AudioOutput } from '../../model/audio-output';
import { t } from '../../../lib/i18n/i18n';
import { PhoneIcon, RoundButton, SpeakerIcon } from '../../../ui';
import { BluetoothIcon, HeadsetIcon } from '../room-icons';

const C = t.mobileRoom.controls;

type Shown = AudioOutput | 'system';

const LOOK: Record<Shown, { label: string; icon: (ink: string) => ReactNode }> = {
  speaker: { label: C.speaker, icon: (ink) => <SpeakerIcon color={ink} /> },
  earpiece: { label: C.earpiece, icon: (ink) => <PhoneIcon color={ink} /> },
  headset: { label: C.headset, icon: (ink) => <HeadsetIcon color={ink} /> },
  bluetooth: { label: C.bluetooth, icon: (ink) => <BluetoothIcon color={ink} /> },
  // iOS routes by itself (and the button opens its route picker).
  system: { label: C.audio, icon: (ink) => <SpeakerIcon color={ink} /> },
};

interface AudioButtonProps {
  output: AudioOutput | null;
  onPress: () => void;
}

/** Read out as the output name, not a toggle; a press steps to the next output the phone has. */
export function AudioButton({ output, onPress }: AudioButtonProps) {
  const look = LOOK[output ?? 'system'];
  return (
    <RoundButton
      label={look.label}
      accessibilityLabel={C.output.replace('{name}', look.label)}
      tone="plain"
      onPress={onPress}
      icon={look.icon}
    />
  );
}
