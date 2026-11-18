import type { RoomJoinResult } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { ClassroomRoom } from '@ab/web-kit/classroom/room/components/ClassroomRoom';

type Card = (onJoined: (room: RoomJoinResult) => void) => ReactNode;

/**
 * A lesson card (plain or family) until the classroom admits the student; then the room covers
 * the page, and «إعادة الدخول» brings the card back.
 */
export function WithRoom({ children }: { children: Card }) {
  const [room, setRoom] = useState<RoomJoinResult | null>(null);
  if (!room) return <>{children(setRoom)}</>;
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-page">
      <ClassroomRoom join={room} onRejoin={() => setRoom(null)} />
    </div>
  );
}
