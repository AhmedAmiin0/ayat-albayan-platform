import type { RoomPresence } from '@ab/schedule';
import type { useHostPanel } from '../../host/use-host-panel';

/** The one panel open over the room's foot, if any. */
export type SheetName = 'people' | 'leave' | 'chatLocked';

export interface LiveSheetProps {
  which: SheetName | null;
  panel: ReturnType<typeof useHostPanel>;
  onClose: () => void;
  onLeave: () => void;
  presence: readonly RoomPresence[];
  onBrowser: (() => void) | null;
}
