import { checkPhone, type Country, defaultCountry, splitInternational } from '@ab/client-core';
import { authApi, useA11yPref, useCodeSignIn, useStepMotion } from '@ab/mobile-kit';
import { useState } from 'react';
import { feel } from '#/sign-in/feedback.ts';
import { phoneRegion } from '#/sign-in/phone/countries.ts';

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
  const [country, setCountry] = useState<Country>(() => defaultCountry(phoneRegion()));
  const [typed, setTyped] = useState('');
  const check = checkPhone(country, typed);
  // A whole number pasted or autofilled («+44 7700…», «0044…»): its country, then the rest.
  const onTyped = (text: string) => {
    const split = splitInternational(text, country);
    setCountry(split?.country ?? country);
    setTyped(split?.national ?? text);
  };

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
    phone: { country, setCountry, typed, setTyped: onTyped, check },
    send,
    resend,
    verify,
    changePhone,
  };
}

export type WhatsAppSignIn = ReturnType<typeof useWhatsAppSignIn>;
