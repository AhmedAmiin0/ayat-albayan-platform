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

/** docs/50 §4: the default way in; Reduce Motion uses a cross-fade; staff numbers get wrongApp. */
export function WhatsAppSignIn() {
  const sign = useWhatsAppSignIn();
  return (
    <StepStage motion={sign.motion} still={sign.still} render={(step) => STEPS[step](sign)} />
  );
}
