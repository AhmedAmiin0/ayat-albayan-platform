import type { WhatsAppSignInState } from '@/sign-in/whatsapp/WhatsAppSignIn';

export interface PhoneStepProps {
  sign: {
    flow: Pick<WhatsAppSignInState['flow'], 'busy' | 'error'>;
    phone: WhatsAppSignInState['phone'];
    send: WhatsAppSignInState['send'];
  };
}
