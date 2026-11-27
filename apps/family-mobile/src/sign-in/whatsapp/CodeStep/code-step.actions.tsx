import type { ReactNode } from 'react';
import { Button, ResendButton, t } from '@ab/mobile-kit';
import type { CodeStepAction } from '@ab/client-core';
import type { WhatsAppSignInState } from '@/sign-in/whatsapp/WhatsAppSignIn';

/** Resend then change number, in the order every code step uses (client-core). */
export const ACTIONS: Record<CodeStepAction, (sign: WhatsAppSignInState) => ReactNode> = {
  resend: (sign) => (
    <ResendButton
      resendIn={sign.flow.resendIn}
      busy={sign.flow.busy}
      onPress={() => void sign.resend()}
    />
  ),
  back: (sign) => (
    <Button variant="ghost" label={t.familyAuth.changePhone} onPress={sign.changePhone} />
  ),
};
