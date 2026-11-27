import type { Country } from '@ab/client-core';

export interface Props {
  current: Country;
  onPick: (country: Country) => void;
  onClose: () => void;
}
