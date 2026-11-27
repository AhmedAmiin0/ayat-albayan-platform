import { canResend, resendLabel } from '@ab/client-core';
import { t } from '../../../lib/i18n/i18n';
import { Button } from '../../../ui/primitives/Button';
import type { ResendButtonProps } from './ResendButton.types';

/** Disabled with the seconds left while the timer runs (client-core rules). */
export function ResendButton({ resendIn, busy, onPress }: ResendButtonProps) {
  return (
    <Button
      variant="ghost"
      label={resendLabel(resendIn, t.familyAuth)}
      disabled={!canResend({ left: resendIn, busy })}
      onPress={onPress}
    />
  );
}
