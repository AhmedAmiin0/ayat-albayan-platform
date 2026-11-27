import type { ReactNode } from 'react';
import type { PhoneEntry } from '@ab/web-kit/auth/phone/use-phone-entry';

export interface PhoneNumberFieldProps {
  entry: PhoneEntry;
  hint: string;
  error?: string | undefined;
  /** The field's name; WhatsApp number by default. */
  label?: string;
  /** A button after the number on the same row. */
  action?: ReactNode;
  /** Enter in the number (the form is not submitted). */
  onEnter?: () => void;
}
