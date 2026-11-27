import { orderCountries, searchCountries } from '@ab/client-core';
import { useState } from 'react';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { browserRegion } from '@ab/web-kit/auth/phone/browser-country';

export function useCountryPicker() {
  const [query, setQuery] = useState('');
  const all = orderCountries(browserRegion(navigator.language), locale);
  const shown = searchCountries(all, query);
  return { query, setQuery, shown };
}
