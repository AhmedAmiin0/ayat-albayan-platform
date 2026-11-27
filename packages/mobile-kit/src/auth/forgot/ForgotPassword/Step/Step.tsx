import { t } from '../../../../lib/i18n/i18n';
import { AppText } from '../../../../ui/primitives/AppText';
import { AuthAlert } from '../../AuthAlert';
import { ForgotCodeStep } from '../../ForgotCodeStep';
import { forgotWords } from '../../forgot-words';
import type { StepProps } from '../ForgotPassword.types';
import { IdentifierStep } from '../IdentifierStep';

export function Step({ forgot, mode }: StepProps) {
  if (forgot.step === 'unavailable') return <AuthAlert text={forgotWords(mode).unavailable} />;
  if (forgot.step === 'identifier') return <IdentifierStep forgot={forgot} mode={mode} />;
  if (forgot.step === 'code') return <ForgotCodeStep forgot={forgot} />;
  if (forgot.step === 'done') return <AuthAlert tone="ok" text={t.familyAuth.passwordSaved} />;
  return <AppText>{t.common.loading}</AppText>;
}
