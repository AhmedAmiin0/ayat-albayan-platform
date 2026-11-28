import { t } from '../../../lib/i18n/i18n';
import { CallCameraIcon, CameraOffIcon, RoundButton } from '../../../ui';
import type { CameraButtonProps } from './CameraButton.types';

export function CameraButton({ on, onPress }: CameraButtonProps) {
  return (
    <RoundButton
      label={t.mobileRoom.controls.camera}
      tone="plain"
      pressed={on}
      onPress={onPress}
      icon={(ink) => (on ? <CallCameraIcon color={ink} /> : <CameraOffIcon color={ink} />)}
    />
  );
}
