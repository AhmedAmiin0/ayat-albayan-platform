import { useWideRoom } from '@ab/web-kit/classroom/panel/use-wide-room';
import type { RoomPanelProps } from './RoomPanel.types';
import { tabWord } from './room-panel.helpers';

export function useRoomPanel({ tab, count }: Pick<RoomPanelProps, 'tab' | 'count'>) {
  const wide = useWideRoom();
  const title = tabWord(tab, count);
  return { wide, title };
}
