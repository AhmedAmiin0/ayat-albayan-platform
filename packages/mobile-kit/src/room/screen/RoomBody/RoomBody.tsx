import { stepView } from './room-body.helpers';
import type { RoomBodyProps } from './RoomBody.types';

/** The step the session is on (docs/35 §3). */
export function RoomBody({ screen, platform }: RoomBodyProps) {
  return <>{stepView(screen.session.phase, { screen, platform })}</>;
}
