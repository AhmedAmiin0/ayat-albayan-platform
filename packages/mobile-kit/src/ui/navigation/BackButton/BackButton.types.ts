export interface BackButtonProps {
  onPress: () => void;
  /** Work in flight (a wizard booking): not pressable until it settles. */
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
}
