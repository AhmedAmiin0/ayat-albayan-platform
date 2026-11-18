import { type Country, nameOf } from '@ab/client-core';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';

interface Props {
  country: Country;
  onClick: () => void;
}

/** The family look only (boards PortalWebSignIn*): the cream start of the one number box. */
const FAMILY = 'family:min-h-[49px] family:sm:min-h-[49px] family:rounded-none family:border-0 ' +
  'family:border-e family:border-e-input family:bg-sunk family:px-3.5 family:font-latin ' +
  'family:font-semibold family:focus-visible:outline-offset-[-3px]!';

/** The number field's start (as the family app, #752): flag + calling code; opens «اختر الدولة». */
export function CountryButton({ country, onClick }: Props) {
  const label = t.familyApp.signIn.country.replace('{name}', nameOf(country, locale));
  return (
    <Button
      type="button"
      variant="secondary"
      aria-label={label}
      onClick={onClick}
      className={`shrink-0 gap-1.5 px-3 font-normal ${FAMILY}`}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {country.flag}
      </span>
      {/* An LTR island: bare, an Arabic line prints «966+» (owner 2026-11-17). */}
      <Ltr className="text-base text-ink">{country.dial}</Ltr>
      <Icon name="chevron-down" className="hidden size-4 text-ink-3 family:block" />
    </Button>
  );
}
