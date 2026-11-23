import type { Country } from '@ab/client-core';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Field, Input } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { CountryButton } from './CountryButton';
import { CountryPicker } from './CountryPicker';
import type { PhoneEntry } from './use-phone-entry';

interface Props {
  entry: PhoneEntry;
  hint: string;
  error?: string | undefined;
  /** The field's name; «رقم الواتساب» by default. */
  label?: string;
  /** A button after the number on the same row (the short-link form's «أضف»). */
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

/**
 * «رقم الواتساب» as the family app (#752): one LTR field, the country (flag + calling code,
 * opening «اختر الدولة») at its start, then the national number or a whole one pasted with +.
 * Shared by the family sign-in, the short-link gate /l/<code> and the short-link form.
 */
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
