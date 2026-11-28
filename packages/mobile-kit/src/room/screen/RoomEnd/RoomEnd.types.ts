import type { RoomPresence } from '@ab/schedule';
import type { ReactNode } from 'react';
import type { RoomPhase } from '../../model/room-phase';
import type { RoomKind } from '../../model/room-types';

export interface ClosedLook {
  message: (kind: RoomKind) => string;
  detail?: string;
  /** A rejoin learns a final end via 410. */
  again: boolean;
  icon: (ink: string) => ReactNode;
}

export type ClosedPhase = Extract<RoomPhase, { step: 'closed' }>;

export interface RoomEndProps {
  phase: Extract<RoomPhase, { step: 'failed' | 'closed' }>;
  kind: RoomKind;
  presence: readonly RoomPresence[];
  /** Back to the preview with a fresh token. */
  onAgain: () => void;
  onBack: () => void;
  /** Null where the app offers no web room. */
  onBrowser: (() => void) | null;
}
