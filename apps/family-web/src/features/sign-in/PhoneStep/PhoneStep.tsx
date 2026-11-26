import { PhoneNumberField, Button, t } from '@ab/web-kit';
import type { PhoneStepProps } from './PhoneStep.types';
import { UNDER } from './phone-step.helpers';

export function PhoneStep({ sign }: PhoneStepProps) {
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
      <Button
        type="submit"
        disabled={sign.flow.busy || sign.check.state !== 'ok'}
        className="min-h-11 w-full"
      >
        {sign.flow.busy ? t.familyAuth.sending : t.familyAuth.sendCode}
      </Button>
    </form>
  );
}
