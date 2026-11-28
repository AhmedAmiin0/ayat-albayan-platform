import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoomButton } from '@ab/web-kit/classroom/room/components/RoomButton';
import { RequestButton } from '@ab/web-kit/classroom/share/RequestButton';
import type { BoardToolbarProps } from './BoardToolbar.types';
import { PenTools } from './PenTools';
import { StudentsSwitch } from './StudentsSwitch';

/** Pen, colours, eraser and undo for whoever may draw; clear / allow students / share for the staff. */
export function BoardToolbar({ board, share, requests }: BoardToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label={t.classroom.board.tools}
      className="flex flex-wrap items-center gap-1.5"
    >
      {board.canDraw ? (
        <PenTools board={board} />
      ) : (
        <>
          <p className="px-1 text-sm text-ink-2">{t.classroom.board.readOnly}</p>
          <RequestButton share={requests} what="draw" />
        </>
      )}
      {board.canManage && (
        <RoomButton
          icon="eraser"
          variant="danger-quiet"
          label={t.classroom.board.clear}
          onClick={board.clear}
        />
      )}
      {board.canAllow && <StudentsSwitch board={board} />}
      {board.canManage && share.supported && (
        <RoomButton
          icon="screen"
          on={share.sharing}
          label={share.sharing ? t.classroom.board.shareOff : t.classroom.board.shareOn}
          onClick={share.toggle}
        />
      )}
    </div>
  );
}
