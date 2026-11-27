import type { ReactNode } from 'react';

export interface AccountCardProps {
  title: string;
  children: ReactNode;
  /** The section's save; omitted for a card without one (the photo has its own buttons). */
  onSave?: () => void;
  pending?: boolean;
  /** Nothing to save yet (unchanged): the button is off. */
  disabled?: boolean;
  /** Under the button: a failure no field owns, then the success note. */
  error?: string;
  notice?: string;
}
