import type { ReactNode } from 'react';
import { CodeStep } from '@/sign-in/whatsapp/CodeStep';
import { PhoneStep } from '@/sign-in/whatsapp/PhoneStep';
import type { WhatsAppSignInState, WhatsAppStep } from './WhatsAppSignIn.types';

export const STEPS: Record<WhatsAppStep, (sign: WhatsAppSignInState) => ReactNode> = {
  phone: (sign) => <PhoneStep sign={sign} />,
  code: (sign) => <CodeStep sign={sign} />,
};
