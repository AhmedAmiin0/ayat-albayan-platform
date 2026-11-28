export interface ChannelSheetHeaderProps {
  title: string;
  /** The viewer is listed last; empty while nothing is loaded. */
  names: string;
  onClose: () => void;
}
