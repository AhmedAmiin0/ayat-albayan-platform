import type { Country } from '@ab/client-core';

export interface CountryRowProps {
  country: Country;
  picked: boolean;
  onPick: (country: Country) => void;
}
