import type { Country } from '@ab/client-core';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
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
  /** The field's name; «رقم الواتساب» by default. */
  label?: string;
  /** A button after the number on the same row (the short-link form's «أضف»). */
  action?: ReactNode;
  /** Enter in the number (the form is not submitted). */
  onEnter?: () => void;
}

/** The family look only (boards PortalWebSignIn*): country and number in one 52 px box. */
const FAMILY_BOX = 'family:gap-0 family:overflow-hidden family:rounded-[14px] ' +
  'family:border-[1.5px] family:border-input family:bg-raised ' +
  'family:focus-within:border-lapis family:focus-within:shadow-[0_0_0_4px_rgba(4,120,87,0.12)] ' +
  'family:has-aria-invalid:border-danger ' +
  'family:has-aria-invalid:shadow-[0_0_0_4px_rgba(220,38,38,0.12)]';
const FAMILY_INPUT = 'family:min-h-[49px] family:sm:min-h-[49px] family:rounded-none ' +
  'family:border-0 family:bg-transparent family:px-4 family:font-latin family:text-lg ' +
  'family:sm:text-lg family:font-semibold family:tracking-[0.5px] family:tabular-nums ' +
  'family:focus:outline-none! family:aria-invalid:ring-0';

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
            <div dir="ltr" className={`flex min-w-0 flex-1 gap-2 ${FAMILY_BOX}`}>
              <CountryButton country={entry.country} onClick={() => setPicking(true)} />
              <Input {...p} type="tel" autoComplete="tel" inputMode="tel"
                value={entry.typed} onChange={(e) => entry.setTyped(e.target.value)}
                className={FAMILY_INPUT} {...enter} />
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
