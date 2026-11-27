import type { Country, PhoneState } from '@ab/client-core';

export interface PhoneFieldProps {
  country: Country;
  typed: string;
  onTyped: (typed: string) => void;
  onCountry: () => void;
  state: PhoneState;
  onSubmit: () => void;
}
