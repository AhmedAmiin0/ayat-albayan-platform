import type { ChannelSenderLabel } from '@ab/shared';
import type { ChannelRef } from '../../channel-api';

export interface ReadsSheetProps {
  refs: ChannelRef;
  /** The message whose ticks were held; null hides the sheet. */
  messageId: string | null;
  onClose: () => void;
}

export interface Person {
  name: string;
  role: ChannelSenderLabel;
  at?: string;
}
