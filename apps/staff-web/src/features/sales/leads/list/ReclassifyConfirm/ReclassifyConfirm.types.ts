export interface ReclassifyConfirmProps {
  /** The move request is in flight. */
  busy: boolean;
  onKeep: () => void;
  onMove: () => void;
}
