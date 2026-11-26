import type { useWhatsAppSignIn } from './use-whatsapp-sign-in';

export type WhatsAppStep = 'phone' | 'code';
export type WhatsAppSignInState = ReturnType<typeof useWhatsAppSignIn>;
