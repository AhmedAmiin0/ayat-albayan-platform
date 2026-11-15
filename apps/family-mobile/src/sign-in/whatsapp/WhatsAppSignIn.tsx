import type { ReactNode } from 'react';
import { StepStage } from '@ab/mobile-kit';
import { CodeStep } from './CodeStep';
import { PhoneStep } from './PhoneStep';
import {
  useWhatsAppSignIn,
  type WhatsAppSignIn as Sign,
  type WhatsAppStep,
} from './use-whatsapp-sign-in';

const STEPS: Record<WhatsAppStep, (sign: Sign) => ReactNode> = {
  phone: (sign) => <PhoneStep sign={sign} />,
  code: (sign) => <CodeStep sign={sign} />,
};

/**
 * «الدخول برقم الواتساب», the family app's default way in (docs/50 §4): number → code → signed
 * in, the two steps moving on a critically damped spring (Reduce Motion: a cross-fade). The auth
 * gate swaps the screen for home once the session is in; a staff number gets «wrongApp».
 */
export function WhatsAppSignIn() {
  const sign = useWhatsAppSignIn();
  return (
    <StepStage motion={sign.motion} still={sign.still} render={(step) => STEPS[step](sign)} />
  );
}
