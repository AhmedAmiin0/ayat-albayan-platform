import type { Country } from '@ab/client-core';
import { useState } from 'react';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { CountryButton } from './CountryButton';
import { CountryPicker } from './CountryPicker';
import type { PhoneEntry } from './use-phone-entry';

interface Props {
  entry: PhoneEntry;
  hint: string;
  error?: string | undefined;
}

/**
 * «رقم الواتساب» as the family app (#752): one LTR field, the country (flag + calling code,
 * opening «اختر الدولة») at its start, then the national number or a whole one pasted with +.
 * Shared by the family sign-in and the short-link gate /l/<code>.
 */
export function PhoneNumberField({ entry, hint, error }: Props) {
  const [picking, setPicking] = useState(false);
  const pick = (country: Country) => {
    entry.setCountry(country);
    setPicking(false);
  };
  return (
    <>
      <Field label={t.familyAuth.phone} hint={hint} {...(error !== undefined && { error })}>
        {(p) => (
          // The input takes the wrapper's LTR: digits start next to the calling code.
          <div dir="ltr" className="flex gap-2">
            <CountryButton country={entry.country} onClick={() => setPicking(true)} />
            <Input {...p} type="tel" autoComplete="tel" inputMode="tel"
              value={entry.typed} onChange={(e) => entry.setTyped(e.target.value)} />
          </div>
        )}
      </Field>
      {picking && (
        <CountryPicker current={entry.country} onPick={pick} onClose={() => setPicking(false)} />
      )}
    </>
  );
}
