import { useRef } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { ShareRequests } from '@ab/web-kit/classroom/share/use-share-requests';
import type { RoomController } from '@ab/web-kit/classroom/room/livekit/use-room';
import { BoardToolbar } from '@ab/web-kit/classroom/board/BoardToolbar';
import type { BoardController } from '@ab/web-kit/classroom/board/use-board';
import { useBoardShare } from '@ab/web-kit/classroom/board/use-board-share';
import { Whiteboard } from '@ab/web-kit/classroom/board/Whiteboard';

export function BoardStage({
  board,
  room,
  requests,
}: {
  board: BoardController;
  room: RoomController;
  requests: ShareRequests;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const share = useBoardShare(canvasRef, room);
  return (
    <section aria-label={t.classroom.board.title} className="flex size-full min-h-56 flex-col gap-2">
      <BoardToolbar board={board} share={share} requests={requests} />
      <div className="min-h-0 flex-1">
        <Whiteboard board={board} canvasRef={canvasRef} />
      </div>
    </section>
  );
}
