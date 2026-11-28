import type { RoomChatSlot } from '@ab/web-kit/classroom/flow/room-kit';
import type { PanelTab } from '@ab/web-kit/classroom/panel/RoomPanel/RoomPanel.types';

export const tabsOf = (chat: RoomChatSlot | null): PanelTab[] =>
  chat ? ['chat', 'people'] : ['people'];
