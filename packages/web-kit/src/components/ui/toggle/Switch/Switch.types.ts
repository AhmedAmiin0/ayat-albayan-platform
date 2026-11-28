export interface SwitchWords {
  on: string;
  off: string;
}

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** The state printed beside the track, so on and off never rest on colour alone. */
  words: SwitchWords;
  /** Its own accessible name; or `labelledBy` when a row label already names it. */
  label?: string;
  labelledBy?: string;
  disabled?: boolean;
  id?: string;
}
