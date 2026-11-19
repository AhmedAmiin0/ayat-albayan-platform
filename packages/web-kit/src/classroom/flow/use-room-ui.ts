import { useState } from 'react';
import type { RoomFeatures } from './room-variant';

/** What is open over (or beside) the call: «المشاركون», «المحادثة» or «التسجيلات». */
export type RoomPanelName = 'people' | 'chat' | 'recordings';

export interface RoomUi {
  panel: RoomPanelName | null;
  open: (panel: RoomPanelName) => void;
  /** The same button again closes its panel (the chat). */
  toggle: (panel: RoomPanelName) => void;
  close: () => void;
  /** «تغادر الحلقة؟» is on screen. */
  asking: boolean;
  /** «اخرج من الحلقة»: asks first where the variant does, else leaves at once. */
  leave: () => void;
  stay: () => void;
  confirmLeave: () => void;
}

/** The room's panels and the leave question; `leaveNow` really disconnects. */
export function useRoomUi(features: RoomFeatures, leaveNow: () => void): RoomUi {
  const [panel, setPanel] = useState<RoomPanelName | null>(null);
  const [asking, setAsking] = useState(false);
  return {
    panel,
    open: setPanel,
    toggle: (next) => setPanel((cur) => (cur === next ? null : next)),
    close: () => setPanel(null),
    asking,
    leave: features.confirmLeave ? () => setAsking(true) : leaveNow,
    stay: () => setAsking(false),
    confirmLeave: () => {
      setAsking(false);
      leaveNow();
    },
  };
}
