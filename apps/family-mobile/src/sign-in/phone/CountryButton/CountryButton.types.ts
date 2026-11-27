import type { Country } from '@ab/client-core';

export interface CountryButtonProps {
  country: Country;
  onPress: () => void;
}
