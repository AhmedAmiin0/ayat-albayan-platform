import { t } from '../../../lib/i18n/i18n';
import { CallMicIcon, MicOffIcon, RoundButton } from '../../../ui';
import type { MicButtonProps } from './MicButton.types';

/** Read out as selected while muted, like calls (docs/28 §5). */
export function MicButton({ on, onPress }: MicButtonProps) {
  return (
    <RoundButton
      label={t.mobileRoom.controls.mute}
      tone="plain"
      pressed={!on}
      onPress={onPress}
      icon={(ink) => (on ? <CallMicIcon color={ink} /> : <MicOffIcon color={ink} />)}
    />
  );
}
