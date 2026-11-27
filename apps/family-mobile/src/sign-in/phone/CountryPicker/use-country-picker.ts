import { useState } from 'react';
import { locale } from '@ab/mobile-kit';
import { type Country, orderCountries, searchCountries } from '@ab/client-core';
import { phoneRegion } from '@/sign-in/phone/countries';
import type { CountryPickerProps } from './CountryPicker.types';

export function useCountryPicker({
  onPick,
  onClose,
}: Pick<CountryPickerProps, 'onPick' | 'onClose'>) {
  const [query, setQuery] = useState('');
  const shown = searchCountries(orderCountries(phoneRegion(), locale), query);
  const close = () => {
    setQuery('');
    onClose();
  };
  const pick = (country: Country) => {
    setQuery('');
    onPick(country);
  };
  return { query, setQuery, shown, close, pick };
}
