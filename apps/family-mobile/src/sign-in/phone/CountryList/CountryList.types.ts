import type { Country } from '@/sign-in/phone/countries';

export interface CountryListProps {
  countries: readonly Country[];
  current: Country;
  onPick: (country: Country) => void;
}
