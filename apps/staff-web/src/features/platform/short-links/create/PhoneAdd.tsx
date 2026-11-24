import { useState } from 'react';
import { PhoneNumberField } from '@ab/web-kit/auth/phone/PhoneNumberField';
import { usePhoneEntry } from '@ab/web-kit/auth/phone/use-phone-entry';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const F = t.shortLinks.form;

interface PhoneAddProps {
  onAdd: (e164: string) => void;
}

/** A WhatsApp number not on the platform, entered and checked the same way as the gate and API. */
export function PhoneAdd({ onAdd }: PhoneAddProps) {
  const entry = usePhoneEntry();
  const [bad, setBad] = useState(false);
  const add = () => {
    const { e164 } = entry.check;
    setBad(e164 === null);
    if (e164 === null) return;
    onAdd(e164);
    entry.setTyped('');
  };
  const wrong = bad || entry.check.state === 'bad';
  const action = (
    <Button type="button" variant="secondary" onClick={add}>
      <Icon name="plus" />
      {F.add}
    </Button>
  );
  return (
    <PhoneNumberField
      entry={entry}
      label={F.addPhone}
      hint={F.phoneHint}
      error={wrong ? t.shortLinks.gate.errors.invalid_phone : undefined}
      action={action}
      onEnter={add}
    />
  );
}
