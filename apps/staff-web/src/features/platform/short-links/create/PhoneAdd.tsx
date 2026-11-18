import { checkPhone, defaultCountry } from '@ab/client-core';
import { useState } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const F = t.shortLinks.form;
/** The academy's usual country; another one is typed whole with «+». */
const COUNTRY = defaultCountry(null);

interface PhoneAddProps {
  onAdd: (e164: string) => void;
}

/** «أضف رقمًا»: a WhatsApp number that is not on the platform, checked as the API checks it. */
export function PhoneAdd({ onAdd }: PhoneAddProps) {
  const [typed, setTyped] = useState('');
  const [bad, setBad] = useState(false);
  const check = checkPhone(COUNTRY, typed);
  const add = () => {
    setBad(check.e164 === null);
    if (check.e164 === null) return;
    onAdd(check.e164);
    setTyped('');
  };
  const error = bad || check.state === 'bad' ? F.errors.phone_invalid : undefined;
  return (
    <Field label={F.addPhone} hint={F.phoneHint} error={error}>
      {(control) => (
        <div className="flex gap-2">
          <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-input bg-card" dir="ltr">
            <span className="grid place-items-center border-e border-rule bg-sunk px-3 text-sm font-semibold">
              <Ltr>{`${COUNTRY.flag} ${COUNTRY.dial}`}</Ltr>
            </span>
            <Input
              {...control}
              inputMode="tel"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-none border-0"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                add();
              }}
            />
          </div>
          <Button type="button" variant="secondary" onClick={add}>
            <Icon name="plus" />
            {F.add}
          </Button>
        </div>
      )}
    </Field>
  );
}
