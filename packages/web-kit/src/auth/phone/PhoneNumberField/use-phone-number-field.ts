import type { Country } from '@ab/client-core';
import { useState } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { PhoneNumberFieldProps } from './PhoneNumberField.types';
import { enterKey } from './phone-number-field.helpers';

export function usePhoneNumberField(props: PhoneNumberFieldProps) {
  const { entry, hint, error, label, action, onEnter } = props;
  const [picking, setPicking] = useState(false);
  const pick = (country: Country) => {
    entry.setCountry(country);
    setPicking(false);
  };
  return {
    entry,
    hint,
    action,
    picking,
    setPicking,
    pick,
    label: label ?? t.familyAuth.phone,
    enter: onEnter && { onKeyDown: enterKey(onEnter) },
    errorProp: error !== undefined && { error },
  };
}
