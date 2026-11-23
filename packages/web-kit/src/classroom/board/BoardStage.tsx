import { useRef } from 'react';
import { t } from '#/lib/i18n/index.ts';
import type { ShareRequests } from '#/classroom/share/use-share-requests.ts';
import type { RoomController } from '#/classroom/room/livekit/use-room.ts';
import { BoardToolbar } from './BoardToolbar';
import type { BoardController } from './use-board';
import { useBoardShare } from './use-board-share';
import { Whiteboard } from './Whiteboard';

/** «السبورة» on the stage: its tools above, the canvas filling the rest at 16:9. */
export function BoardStage({ board, room, requests }: { board: BoardController; room: RoomController; requests: ShareRequests }) {
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
