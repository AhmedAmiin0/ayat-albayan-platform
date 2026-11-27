import type { Country } from '@ab/client-core';

export interface CountryPickerProps {
  open: boolean;
  current: Country;
  onPick: (country: Country) => void;
  onClose: () => void;
}
