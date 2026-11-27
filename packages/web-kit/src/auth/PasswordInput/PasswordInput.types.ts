import type { FieldControlProps } from '@ab/web-kit/components/ui/form/Field';

export type Props = FieldControlProps & {
  value: string;
  onValue: (value: string) => void;
  /** `new-password` for a new one (password managers offer to generate and save it). */
  autoComplete?: 'current-password' | 'new-password';
};
