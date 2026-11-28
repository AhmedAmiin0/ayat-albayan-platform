export interface Props {
  unread: number;
  /** The panel shows the chat now. */
  on: boolean;
  round: boolean;
  onClick: () => void;
}
