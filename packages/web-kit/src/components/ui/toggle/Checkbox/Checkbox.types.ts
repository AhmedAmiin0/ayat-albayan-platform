export interface CheckboxProps {
  /** The visible label; the whole label is the hit area. */
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** A short line under the label that describes the box to assistive tech too. */
  hint?: string;
  disabled?: boolean;
  id?: string;
}

export interface CheckboxView {
  hintId: string;
}
