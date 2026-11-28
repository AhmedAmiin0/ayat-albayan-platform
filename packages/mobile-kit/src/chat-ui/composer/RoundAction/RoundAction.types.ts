export interface RoundActionProps {
  mode: 'mic' | 'send';
  /** Send only: nothing to send, or a send on its way. */
  disabled?: boolean;
  onSend?: () => void;
  /** The circle's side: 44pt (the staff inbox) unless given (the channel's 48). */
  size?: number;
}
