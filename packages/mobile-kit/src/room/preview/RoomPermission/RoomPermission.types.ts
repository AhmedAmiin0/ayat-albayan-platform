export interface RoomPermissionProps {
  onAllow: () => void;
  onSkip: () => void;
  onBrowser: (() => void) | null;
}
