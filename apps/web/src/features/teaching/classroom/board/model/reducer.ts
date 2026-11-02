import type { BoardKind, BoardMessage, JoinRole } from '@ab/shared';
import { canAllowStudents, canDraw, canManageBoard, type BoardState, type Stroke } from './model';

/** A message and who sent it (the local person for their own actions). Roles come from the token. */
export interface BoardInput {
  msg: BoardMessage;
  from: { identity: string; role: JoinRole | null };
}

function draw(state: BoardState, stroke: Stroke): BoardState {
  const i = state.strokes.findIndex((s) => s.id === stroke.id);
  if (i < 0) return { ...state, strokes: [...state.strokes, stroke] };
  const old = state.strokes[i];
  if (!old || old.by !== stroke.by) return state;
  const strokes = [...state.strokes];
  strokes[i] = { ...old, pts: [...old.pts, ...stroke.pts] };
  return { ...state, strokes };
}

/** Union by id; a longer copy of a stroke wins (it saw more of the drawing). Idempotent. */
function merge(state: BoardState, incoming: readonly Stroke[]): BoardState {
  const byId = new Map(state.strokes.map((s) => [s.id, s]));
  for (const s of incoming) {
    const had = byId.get(s.id);
    if (!had || had.pts.length < s.pts.length) byId.set(s.id, s);
  }
  return { ...state, strokes: [...byId.values()] };
}

function undo(state: BoardState, own: { id: string; by: string }): BoardState {
  const strokes = state.strokes.filter((s) => !(s.id === own.id && s.by === own.by));
  return strokes.length === state.strokes.length ? state : { ...state, strokes };
}

type Of<K extends BoardKind> = Extract<BoardMessage, { t: K }>;
type Apply<K extends BoardKind> = (
  state: BoardState,
  input: { msg: Of<K>; from: BoardInput['from'] },
) => BoardState;

/** Strokes from anyone in the room; the flags only from the staff. */
const sync: Apply<'sync'> = (state, { msg, from }) => {
  if (from.role === null) return state;
  const merged = merge(state, msg.strokes);
  if (!canManageBoard(from.role)) return merged;
  return { ...merged, studentsCanDraw: msg.studentsCanDraw, open: msg.open, allowed: msg.allowed };
};

/** «سماح» adds one guest to the drawers, «إيقاف كتابة» takes them out (staff only). */
function allowOne(state: BoardState, { who, allow }: { who: string; allow: boolean }): BoardState {
  const others = state.allowed.filter((x) => x !== who);
  return { ...state, allowed: allow ? [...others, who] : others };
}

/** One rule per message kind (D5: a transition table); a refused message leaves the board as is. */
const APPLY: { [K in BoardKind]: Apply<K> } = {
  draw: (state, { msg, from }) =>
    msg.stroke.by === from.identity && canDraw(from, state) ? draw(state, msg.stroke) : state,
  undo: (state, { msg, from }) => undo(state, { id: msg.id, by: from.identity }),
  clear: (state, { from }) => (canManageBoard(from.role) ? { ...state, strokes: [] } : state),
  perm: (state, { msg, from }) =>
    canAllowStudents(from.role) ? { ...state, studentsCanDraw: msg.studentsCanDraw } : state,
  open: (state, { msg, from }) =>
    canManageBoard(from.role) ? { ...state, open: msg.open } : state,
  allow: (state, { msg, from }) => (canManageBoard(from.role) ? allowOne(state, msg) : state),
  'sync-request': (state) => state,
  sync,
};

/**
 * The board after one message. Permissions are checked here, on receive, not only when sending:
 * a stroke must be the sender's own and the sender must be allowed to draw; clear / open belong to
 * the staff, «السماح للطلاب بالكتابة» to the teacher or admin; anything else leaves the board as is.
 */
export function boardReducer(state: BoardState, input: BoardInput): BoardState {
  const apply = APPLY[input.msg.t] as Apply<BoardKind>;
  return apply(state, input);
}

/** Answer a late joiner's sync-request? Anyone holding strokes; the staff also for the flags alone. */
export function shouldAnswerSync(state: BoardState, role: JoinRole | null): boolean {
  return state.strokes.length > 0 || (canManageBoard(role) && (state.open || state.studentsCanDraw || state.allowed.length > 0));
}
