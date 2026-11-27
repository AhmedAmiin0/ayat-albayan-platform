import type { ReactNode } from 'react';

export interface Props {
  /** The identifier control's id: `email` on the staff tab (e2e), `username` on the family tab. */
  id: 'email' | 'username';
  label: string;
  hint?: string;
  children?: ReactNode;
}
