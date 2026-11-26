import { StepStage } from '@ab/mobile-kit';
import { useWhatsAppSignIn } from './use-whatsapp-sign-in';
import { STEPS } from './whatsapp-sign-in.steps';

/** docs/50 §4: the default way in; Reduce Motion uses a cross-fade; staff numbers get wrongApp. */
export function WhatsAppSignIn() {
  const sign = useWhatsAppSignIn();
  return <StepStage motion={sign.motion} still={sign.still} render={(step) => STEPS[step](sign)} />;
}
