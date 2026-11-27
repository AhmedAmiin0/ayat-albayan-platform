import type { ReactNode } from 'react';

export interface Props {
  label: string;
  hint?: string;
  /** tel = the WhatsApp number; username = email / username / student code. */
  kind: 'tel' | 'username';
  value: string;
  onValue: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error?: string;
  children?: ReactNode;
}
