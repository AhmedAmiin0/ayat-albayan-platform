export interface BellButtonProps {
  /** Opens the app's notifications screen (each app routes it). */
  onPress: () => void;
  /** A round button (the calm Today header's 44pt circle): the pressed wash takes the circle. */
  round?: boolean;
}
