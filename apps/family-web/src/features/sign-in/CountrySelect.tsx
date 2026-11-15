import { COUNTRIES, type Country } from '@ab/client-core';
import { Select } from '@ab/web-kit/components/ui/form/select';
import { t } from '@ab/web-kit/lib/i18n/i18n';

interface Props {
  value: Country;
  onChange: (country: Country) => void;
}

/** «الدولة»: the academy's countries with their calling codes (client-core COUNTRIES). */
export function CountrySelect({ value, onChange }: Props) {
  const name = t.familyApp.signIn.countries[value.code];
  return (
    <Select
      aria-label={t.familyApp.signIn.country.replace('{name}', name)}
      value={value.code}
      className="w-auto shrink-0"
      onChange={(e) => onChange(COUNTRIES.find((c) => c.code === e.target.value) ?? value)}
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {`${c.flag} ${t.familyApp.signIn.countries[c.code]} ${c.dial}`}
        </option>
      ))}
    </Select>
  );
}
