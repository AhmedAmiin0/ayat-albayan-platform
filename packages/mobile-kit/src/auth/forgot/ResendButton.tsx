import { canResend, resendLabel } from '@ab/client-core';
import { t } from '../../lib/i18n/i18n';
import { Button } from '../../ui/primitives/Button';

interface ResendButtonProps {
  /** Seconds before it comes back (use-countdown, RESEND_SECONDS). */
  resendIn: number;
  busy: boolean;
  onPress: () => void;
}

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
