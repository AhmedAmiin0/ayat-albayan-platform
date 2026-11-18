import type { PhoneState } from '@ab/client-core';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CountryButton } from './phone/CountryButton';
import { CountryPicker } from './phone/CountryPicker';
import type { WhatsAppSignIn } from './use-whatsapp-sign-in';

/** The line under the number while it is typed: the hint, or why it cannot be a number. */
const UNDER: Readonly<Record<PhoneState, () => string | undefined>> = {
  empty: () => undefined,
  typing: () => undefined,
  ok: () => undefined,
  bad: () => t.familyApp.signIn.phoneBad,
};

/**
 * The WhatsApp number as the family app (#752): one LTR field, the country (flag + calling code,
 * opening «اختر الدولة») at its start, then the national number or a whole one pasted with +;
 * «أرسل الرمز» once it is a number.
 */
export function PhoneStep({ sign }: { sign: WhatsAppSignIn }) {
  const [picking, setPicking] = useState(false);
  const error = UNDER[sign.check.state]() ?? sign.flow.error;
  const pick = (country: WhatsAppSignIn['country']) => {
    sign.setCountry(country);
    setPicking(false);
  };
  return (
    <>
      <form
        noValidate
        className="grid gap-[22px]"
        onSubmit={(e) => {
          e.preventDefault();
          sign.send();
        }}
      >
        <Field label={t.familyAuth.phone} hint={t.familyApp.signIn.phoneHint} error={error}>
          {(p) => (
            // The input takes the wrapper's LTR: digits start next to the calling code.
            <div dir="ltr" className="flex gap-2">
              <CountryButton country={sign.country} onClick={() => setPicking(true)} />
              <Input {...p} type="tel" autoComplete="tel" inputMode="tel"
                value={sign.typed} onChange={(e) => sign.setTyped(e.target.value)} />
            </div>
          )}
        </Field>
        <Button type="submit" disabled={sign.flow.busy || sign.check.state !== 'ok'} className="min-h-11 w-full">
          {sign.flow.busy ? t.familyAuth.sending : t.familyAuth.sendCode}
        </Button>
      </form>
      {picking && (
        <CountryPicker current={sign.country} onPick={pick} onClose={() => setPicking(false)} />
      )}
    </>
  );
}
