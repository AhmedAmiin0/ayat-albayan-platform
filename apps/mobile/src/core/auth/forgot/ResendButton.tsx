import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';

interface ResendButtonProps {
  /** Seconds before it comes back (use-countdown, RESEND_SECONDS). */
  resendIn: number;
  busy: boolean;
  onPress: () => void;
}

/** «أعد إرسال الرمز», disabled with the seconds left while the timer runs. */
export function ResendButton({ resendIn, busy, onPress }: ResendButtonProps) {
  const label =
    resendIn > 0
      ? t.familyAuth.resendIn.replace('{seconds}', String(resendIn))
      : t.familyAuth.resend;
  return <Button variant="ghost" label={label} disabled={busy || resendIn > 0} onPress={onPress} />;
}
