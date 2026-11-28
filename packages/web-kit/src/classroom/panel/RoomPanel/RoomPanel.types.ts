import type { ReactNode } from 'react';
import type { RoomChatSlot } from '@ab/web-kit/classroom/flow/room-kit';

export type PanelTab = 'chat' | 'people';

export interface RoomPanelProps {
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  onClose: () => void;
  /** The family's chat; none shows the people only. */
  chat: RoomChatSlot | null;
  people: ReactNode;
  count: number;
}
