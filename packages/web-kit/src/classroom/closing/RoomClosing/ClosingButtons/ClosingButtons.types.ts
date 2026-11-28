export interface ClosingButtonsProps {
  again: (() => void) | undefined;
  onBack: (() => void) | undefined;
  busy: boolean;
}
