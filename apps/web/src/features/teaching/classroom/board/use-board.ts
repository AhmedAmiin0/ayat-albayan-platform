import type { JoinRole } from '@ab/shared';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { RoomController } from '../room/livekit/use-room';
import { canAllowStudents, canDraw, canManageBoard, EMPTY_BOARD, lastStrokeOf, type BoardState, type PenColor } from './model/model';
import type { BoardMessage } from './model/messages';
import { boardReducer } from './model/reducer';
import { useBoardSync } from './use-board-sync';
import { usePen, type BoardTool, type Pen } from './use-pen';

export interface BoardController {
  state: BoardState;
  /** Shown on this screen: the staff's open/close, unless this viewer toggled it themselves. */
  visible: boolean;
  canDraw: boolean;
  canManage: boolean;
  canAllow: boolean;
  tool: BoardTool;
  color: PenColor;
  setTool: (tool: BoardTool) => void;
  setColor: (color: PenColor) => void;
  pen: Pen;
  undo: () => void;
  clear: () => void;
  setStudentsCanDraw: (on: boolean) => void;
  /** «سماح» / «إيقاف كتابة {name}» for one guest (staff). */
  allowDrawer: (identity: string, allow: boolean) => void;
  /** Opens the board for everyone (staff, after «اطلب فتح السبورة»). */
  openForAll: () => void;
  toggleVisible: () => void;
}

/** The whiteboard of one room: shared strokes and flags, plus this viewer's pen and view. */
export function useBoard({ room, role }: { room: RoomController; role: JoinRole }): BoardController {
  const [state, dispatch] = useReducer(boardReducer, EMPTY_BOARD);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const identity = room.snap.tiles.find((x) => x.isLocal)?.identity ?? '';
  const me = useMemo(() => ({ identity, role }), [identity, role]);
  const send = useBoardSync({ room, status: room.snap.status, me, state: stateRef, dispatch });
  const [tool, setTool] = useState<BoardTool>('pen');
  const [color, setColor] = useState<PenColor>('ink');
  const pen = usePen({ me, send, dispatch, tool, color });

  // A local toggle wins until the staff open or close the board again.
  const [override, setOverride] = useState<boolean | null>(null);
  const [seenOpen, setSeenOpen] = useState(state.open);
  if (seenOpen !== state.open) {
    setSeenOpen(state.open);
    setOverride(null);
  }
  const visible = override ?? state.open;

  const act = useCallback(
    (msg: BoardMessage) => {
      dispatch({ msg, from: me });
      send(msg);
    },
    [me, send],
  );
  const manage = canManageBoard(role);

  return {
    state,
    visible,
    canDraw: canDraw(me, state),
    canManage: manage,
    canAllow: canAllowStudents(role),
    tool,
    color,
    setTool,
    setColor,
    pen,
    undo: () => {
      const last = lastStrokeOf(state.strokes, me.identity);
      if (last) act({ t: 'undo', id: last.id });
    },
    clear: () => act({ t: 'clear' }),
    setStudentsCanDraw: (on) => act({ t: 'perm', studentsCanDraw: on }),
    allowDrawer: (who, allow) => act({ t: 'allow', who, allow }),
    openForAll: () => act({ t: 'open', open: true }),
    toggleVisible: () => (manage ? act({ t: 'open', open: !visible }) : setOverride(!visible)),
  };
}
