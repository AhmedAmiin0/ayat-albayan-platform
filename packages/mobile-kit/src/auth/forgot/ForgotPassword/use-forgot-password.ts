import { forgotWords } from '../forgot-words';
import { useForgot } from '../use-forgot';
import type { ForgotPasswordProps } from './ForgotPassword.types';

export function useForgotPassword({ mode = 'staff' }: Pick<ForgotPasswordProps, 'mode'>) {
  const words = forgotWords(mode);
  const forgot = useForgot(words.side);
  const backVariant = forgot.step === 'done' ? 'primary' : 'ghost';
  return { forgot, mode, title: words.title, backVariant } as const;
}
