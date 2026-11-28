import type { RoomContext } from '@ab/web-kit/classroom/flow/room-kit';
import type { RoomVariant } from '@ab/web-kit/classroom/flow/room-variant';
import type { ClosingKind } from '@ab/web-kit/classroom/closing/closing-kinds';

/** The page's own rejoin: under way, or refused (its words). */
export interface RejoinState {
  busy: boolean;
  note: string | null;
}

export interface RoomClosingProps {
  kind: ClosingKind;
  /** Staff keep their plain left screen (closing-kinds.ts). */
  variant: RoomVariant;
  /** A failed connect's own words. */
  failure: string | null;
  context: RoomContext | null;
  onRejoin?: (() => void) | undefined;
  /** Back to the page that opened the room, never a dead end. */
  onBack?: (() => void) | undefined;
  rejoin?: RejoinState | undefined;
}
