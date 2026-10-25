import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { RoomButton } from '../RoomButton';
import { RequestButton } from '../share/RequestButton';
import type { ShareRequests } from '../share/use-share-requests';
import { PEN_COLORS, type PenColor } from './model';
import type { BoardController } from './use-board';
import type { BoardShare } from './use-board-share';

// Literal classes so Tailwind's scanner sees them: each pen colour is a theme token.
const SWATCH: Record<PenColor, string> = {
  ink: 'bg-ink',
  lapis: 'bg-lapis',
  cinnabar: 'bg-danger',
  saffron: 'bg-act',
  gold: 'bg-gold',
};

function Swatch({ color, board }: { color: PenColor; board: BoardController }) {
  const picked = board.tool === 'pen' && board.color === color;
  const choose = () => {
    board.setColor(color);
    board.setTool('pen');
  };
  return (
    <button
      type="button"
      aria-pressed={picked}
      aria-label={t.classroom.board.color.replace('{name}', t.classroom.board.colors[color])}
      onClick={choose}
      className="grid size-11 place-items-center rounded-full sm:size-9"
    >
      <span className={cn('size-6 rounded-full border-2 border-raised ring-1 ring-rule-strong', SWATCH[color], picked && 'ring-3 ring-lapis')} />
    </button>
  );
}

function StudentsSwitch({ board }: { board: BoardController }) {
  return (
    <label className="flex min-h-11 items-center gap-2 px-1 text-sm">
      <input
        type="checkbox"
        checked={board.state.studentsCanDraw}
        onChange={(e) => board.setStudentsCanDraw(e.target.checked)}
        className="size-4 accent-[var(--lapis)]"
      />
      {t.classroom.board.allowStudents}
    </label>
  );
}

interface Props {
  board: BoardController;
  share: BoardShare;
  /** A guest who may not draw asks «اطلب الكتابة على السبورة». */
  requests: ShareRequests;
}

/** Pen, colours, eraser and undo for whoever may draw; clear / allow students / share for the staff. */
export function BoardToolbar({ board, share, requests }: Props) {
  return (
    <div role="toolbar" aria-label={t.classroom.board.tools} className="flex flex-wrap items-center gap-1.5">
      {board.canDraw ? (
        <>
          <RoomButton icon="pen" on={board.tool === 'pen'} label={t.classroom.board.pen} onClick={() => board.setTool('pen')} />
          {PEN_COLORS.map((c) => (
            <Swatch key={c} color={c} board={board} />
          ))}
          <RoomButton icon="eraser" on={board.tool === 'eraser'} label={t.classroom.board.eraser} onClick={() => board.setTool('eraser')} />
          <RoomButton icon="undo" label={t.classroom.board.undo} onClick={board.undo} />
        </>
      ) : (
        <>
          <p className="px-1 text-sm text-ink-2">{t.classroom.board.readOnly}</p>
          <RequestButton share={requests} what="draw" />
        </>
      )}
      {board.canManage && <RoomButton icon="eraser" variant="danger-quiet" label={t.classroom.board.clear} onClick={board.clear} />}
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
