import { type Country, nameOf } from '@ab/client-core';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';

interface Props {
  country: Country;
  onClick: () => void;
}

/** Flag and calling code at the field's start (#752); opens the country picker. */
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
