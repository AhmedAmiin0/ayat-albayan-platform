import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoomButton } from '@ab/web-kit/classroom/room/components/RoomButton';
import { PEN_COLORS } from '@ab/web-kit/classroom/board/model/model';
import { Swatch } from './Swatch';
import type { PenToolsProps } from './PenTools.types';

export function PenTools({ board }: PenToolsProps) {
  return (
    <>
      <RoomButton
        icon="pen"
        on={board.tool === 'pen'}
        label={t.classroom.board.pen}
        onClick={() => board.setTool('pen')}
      />
      {PEN_COLORS.map((c) => (
        <Swatch key={c} color={c} board={board} />
      ))}
      <RoomButton
        icon="eraser"
        on={board.tool === 'eraser'}
        label={t.classroom.board.eraser}
        onClick={() => board.setTool('eraser')}
      />
      <RoomButton icon="undo" label={t.classroom.board.undo} onClick={board.undo} />
    </>
  );
}
