import { type Country, nameOf } from '@ab/client-core';
import { Ltr, Button } from '#/components/ui/index.ts';
import { t, locale } from '#/lib/i18n/index.ts';

interface Props {
  country: Country;
  onClick: () => void;
}

/** The number field's start (as the family app, #752): flag + calling code; opens «اختر الدولة». */
export function CountryButton({ country, onClick }: Props) {
  const label = t.familyApp.signIn.country.replace('{name}', nameOf(country, locale));
  return (
    <Button
      type="button"
      variant="secondary"
      aria-label={label}
      onClick={onClick}
      className="shrink-0 gap-1.5 px-3 font-normal"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {country.flag}
      </span>
      {/* An LTR island: bare, an Arabic line prints «966+» (owner 2026-11-17). */}
      <Ltr className="text-base text-ink">{country.dial}</Ltr>
    </Button>
  );
}
