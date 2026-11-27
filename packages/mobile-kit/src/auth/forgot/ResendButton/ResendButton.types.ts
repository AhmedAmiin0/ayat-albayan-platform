export interface ResendButtonProps {
  /** Seconds before it comes back (use-countdown, RESEND_SECONDS). */
  resendIn: number;
  busy: boolean;
  onPress: () => void;
}
