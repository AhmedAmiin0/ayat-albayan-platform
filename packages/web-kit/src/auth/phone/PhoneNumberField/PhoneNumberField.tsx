import type { Country } from '@ab/client-core';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Field } from '@ab/web-kit/components/ui/form/Field';
import { Input } from '@ab/web-kit/components/ui/form/Input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CountryButton } from '@ab/web-kit/auth/phone/CountryButton';
import { CountryPicker } from '@ab/web-kit/auth/phone/CountryPicker';
import type { PhoneEntry } from '@ab/web-kit/auth/phone/use-phone-entry';

interface Props {
  entry: PhoneEntry;
  hint: string;
  error?: string | undefined;
  /** The field's name; WhatsApp number by default. */
  label?: string;
  /** A button after the number on the same row. */
  action?: ReactNode;
  /** Enter in the number (the form is not submitted). */
  onEnter?: () => void;
}

/** Enter runs `onEnter` instead of submitting the form around the field. */
const enterKey = (onEnter: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  onEnter();
};

/** One LTR field with the country at its start; shared by family sign-in and short links. */
export function PhoneNumberField({ entry, hint, error, ...more }: Props) {
  const [picking, setPicking] = useState(false);
  const label = more.label ?? t.familyAuth.phone;
  const enter = more.onEnter && { onKeyDown: enterKey(more.onEnter) };
  const pick = (country: Country) => {
    entry.setCountry(country);
    setPicking(false);
  };
  return (
    <>
      <Field label={label} hint={hint} {...(error !== undefined && { error })}>
        {(p) => (
          <div className="flex gap-2">
            {/* The input takes the wrapper's LTR: digits start next to the calling code. */}
            <div dir="ltr" className="flex min-w-0 flex-1 gap-2">
              <CountryButton country={entry.country} onClick={() => setPicking(true)} />
              <Input {...p} type="tel" autoComplete="tel" inputMode="tel"
                value={entry.typed} onChange={(e) => entry.setTyped(e.target.value)}
                {...enter} />
            </div>
            {more.action}
          </div>
        )}
      </Field>
      {picking && (
        <CountryPicker current={entry.country} onPick={pick} onClose={() => setPicking(false)} />
      )}
    </>
  );
}
