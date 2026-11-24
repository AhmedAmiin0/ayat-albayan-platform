import { useState } from 'react';
import type { RoomFeatures } from './room-variant';

export type RoomPanelName = 'people' | 'chat' | 'recordings';

export interface RoomUi {
  panel: RoomPanelName | null;
  open: (panel: RoomPanelName) => void;
  /** The same button again closes its panel (the chat). */
  toggle: (panel: RoomPanelName) => void;
  /** Opens the staff drawer; the family's side panel closes on the same button. */
  people: () => void;
  close: () => void;
  /** The leave confirm is on screen. */
  asking: boolean;
  /** Asks first where the variant does, else leaves at once. */
  leave: () => void;
  stay: () => void;
  confirmLeave: () => void;
}

/** The room's panels and the leave question; `leaveNow` really disconnects. */
export function useRoomUi(features: RoomFeatures, leaveNow: () => void): RoomUi {
  const [panel, setPanel] = useState<RoomPanelName | null>(null);
  const [asking, setAsking] = useState(false);
  const toggle = (next: RoomPanelName) => setPanel((cur) => (cur === next ? null : next));
  return {
    panel,
    open: setPanel,
    toggle,
    people: () => (features.sidePanel ? toggle : setPanel)('people'),
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
