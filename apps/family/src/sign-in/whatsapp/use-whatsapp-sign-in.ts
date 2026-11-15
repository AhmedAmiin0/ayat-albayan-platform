import { authApi, useA11yPref, useCodeSignIn, useStepMotion } from '@ab/mobile-kit';
import { useState } from 'react';
import { feel } from '@/sign-in/feedback';
import { type Country, defaultCountry } from '@/sign-in/phone/countries';
import { checkPhone } from '@/sign-in/phone/phone-check';

export type WhatsAppStep = 'phone' | 'code';

/**
 * The WhatsApp sign-in (docs/50 §4, POST /auth/code/request | verify): the number (country +
 * national, checked while typing) → the code → the session. Each answer is felt (a success or an
 * error haptic); a code that went out moves to the code step, «غيّر الرقم» moves back.
 */
export function useWhatsAppSignIn() {
  const flow = useCodeSignIn(authApi.familyCodes);
  const still = useA11yPref('reduceMotion');
  const motion = useStepMotion<WhatsAppStep>('phone', still);
  const [country, setCountry] = useState<Country>(() => defaultCountry());
  const [typed, setTyped] = useState('');
  const check = checkPhone(country, typed);

  const send = async () => {
    if (check.e164 === null || flow.busy) return;
    const refused = await flow.send(check.e164);
    feel(refused);
    if (refused === null) motion.go('code');
  };
  const resend = async () => {
    if (flow.target === null) return;
    feel(await flow.send(flow.target));
  };
  const verify = async (code: string) => {
    const refused = await flow.verify(code);
    feel(refused);
    return refused;
  };
  const changePhone = () => {
    flow.changePhone();
    motion.go('phone', 'back');
  };

  return {
    flow,
    motion,
    still,
    phone: { country, setCountry, typed, setTyped, check },
    send,
    resend,
    verify,
    changePhone,
  };
}

export type WhatsAppSignIn = ReturnType<typeof useWhatsAppSignIn>;
