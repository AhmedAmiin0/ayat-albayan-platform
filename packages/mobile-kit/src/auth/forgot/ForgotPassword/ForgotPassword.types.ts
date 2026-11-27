import type { ForgotMode } from '../forgot-words';
import type { Forgot } from '../use-forgot';

export interface StepProps {
  forgot: Forgot;
  mode: ForgotMode;
}

export interface ForgotPasswordProps {
  /** Returns to the sign-in form. */
  onBack: () => void;
  mode?: ForgotMode;
}
