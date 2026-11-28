import type { TextInputProps } from 'react-native';

export interface FieldProps
  extends Omit<TextInputProps, 'style' | 'onFocus' | 'onBlur' | 'onSubmitEditing'> {
  label: string;
  /** LTR value (email, code, URL): the input is an LTR island in either UI language. */
  ltr?: boolean;
  /** A required question of the Google Form: «*» after the label, announced as required. */
  required?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
}

export type FieldInput = Omit<FieldProps, 'label' | 'ltr' | 'required'>;

/** What Field hands the input under its label, whichever input renders it. */
export interface FieldInputProps {
  label: string;
  hint: string | undefined;
  ltr: boolean;
  focused: boolean;
  onFocusChange: (focused: boolean) => void;
  input: FieldInput;
}
