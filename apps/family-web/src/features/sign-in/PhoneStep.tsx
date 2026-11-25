import type { PhoneState } from '@ab/client-core';
import { PhoneNumberField, Button, t } from '@ab/web-kit';
import type { WhatsAppSignIn } from './use-whatsapp-sign-in';

/** The line under the number while it is typed: the hint, or why it cannot be a number. */
const UNDER: Readonly<Record<PhoneState, () => string | undefined>> = {
  empty: () => undefined,
  typing: () => undefined,
  ok: () => undefined,
  bad: () => t.familyApp.signIn.phoneBad,
};

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
      <PhoneNumberField entry={sign.entry} hint={t.familyApp.signIn.phoneHint} error={error} />
      <Button type="submit" disabled={sign.flow.busy || sign.check.state !== 'ok'} className="min-h-11 w-full">
        {sign.flow.busy ? t.familyAuth.sending : t.familyAuth.sendCode}
      </Button>
    </form>
  );
}
