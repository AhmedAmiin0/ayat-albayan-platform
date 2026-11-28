import type { MessageStatus } from '@ab/catalog';

export interface DeliveryTicksProps {
  /** Any chat's status: the student channel passes 'sent' / 'read' only. */
  status: MessageStatus;
  /** A long press toggles the sent, delivered and read times. */
  times?: string;
  /** The bubble shows the times on its own line under the meta row. */
  onLongPress?: () => void;
  /** The row that did not go out: a tap opens what can be done, as WhatsApp. */
  onPress?: () => void;
  /** Said after the status word when tappable: why it failed. */
  actionLabel?: string;
  /** In a chat-list row: the row's label already says the word (no separate stop). */
  inList?: boolean;
  /** A long press of its own instead of the times. */
  onHold?: () => void;
  /** A send that may have gone reads as not yet confirmed (bubbleWord). */
  errorCode?: string | null;
}
