import type { PhoneState } from '@ab/client-core';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CountrySelect } from './CountrySelect';
import type { WhatsAppSignIn } from './use-whatsapp-sign-in';

/** The line under the number while it is typed: the hint, or why it cannot be a number. */
const UNDER: Readonly<Record<PhoneState, () => string | undefined>> = {
  empty: () => undefined,
  typing: () => undefined,
  ok: () => undefined,
  bad: () => t.familyApp.signIn.phoneBad,
};

/** The WhatsApp number: the country, the national number (or a whole +…), «أرسل الرمز». */
export function PhoneStep({ sign }: { sign: WhatsAppSignIn }) {
  const error = UNDER[sign.check.state]() ?? sign.flow.error;
  return (
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
          <div className="flex gap-2">
            <Input {...p} type="tel" dir="ltr" autoComplete="tel-national" inputMode="tel"
              value={sign.typed} onChange={(e) => sign.setTyped(e.target.value)} />
            <CountrySelect value={sign.country} onChange={sign.setCountry} />
          </div>
        )}
      </Field>
      <Button type="submit" disabled={sign.flow.busy || sign.check.state !== 'ok'} className="min-h-11 w-full">
        {sign.flow.busy ? t.familyAuth.sending : t.familyAuth.sendCode}
      </Button>
    </form>
  );
}
