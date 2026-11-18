import {
  checkPhone, type Country, defaultCountry, type PhoneCheck, splitInternational,
} from '@ab/client-core';
import { useState } from 'react';
import { browserRegion } from './browser-country';

const firstCountry = () => defaultCountry(browserRegion(navigator.language));

/** A WhatsApp number as typed: the picked country, the national digits, and the live check. */
export interface PhoneEntry {
  country: Country;
  setCountry: (country: Country) => void;
  typed: string;
  /** A whole number pasted or autofilled («+44 7700…», «0044…») picks its country. */
  setTyped: (text: string) => void;
  /** client-core checkPhone: `e164` once it is a number the API takes. */
  check: PhoneCheck;
}

/**
 * The number field's state (#752, docs/50 §4), shared by the family sign-in and the short-link
 * gate /l/<code>: it starts in the browser's region (else Saudi Arabia) and is checked as typed.
 */
export function usePhoneEntry(): PhoneEntry {
  const [country, setCountry] = useState<Country>(firstCountry);
  const [typed, setRaw] = useState('');
  const setTyped = (text: string) => {
    const split = splitInternational(text, country);
    setCountry(split?.country ?? country);
    setRaw(split?.national ?? text);
  };
  return { country, setCountry, typed, setTyped, check: checkPhone(country, typed) };
}
