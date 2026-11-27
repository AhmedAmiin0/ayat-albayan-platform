import type { FieldProps } from '../../ui/form/Field';

export interface AccountFieldProps extends FieldProps {
  /** The field's own message (account.errors.*), announced as an alert under it. */
  error?: string;
  /** A short line under the input (format, length). */
  hint?: string;
}
