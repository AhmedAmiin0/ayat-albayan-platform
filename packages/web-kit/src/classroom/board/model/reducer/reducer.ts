import type { JoinRole } from '@ab/shared';
import type { BoardMessage } from '@ab/web-kit/classroom/board/model/messages';
import { canAllowStudents, canDraw, canManageBoard, type BoardState, type Stroke } from '@ab/web-kit/classroom/board/model/model';

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

/**
 * Strokes only from someone who may draw (the staff, an allowed guest), as a 'draw' is: a guest
 * without the grant could otherwise paint the board through a sync answer. A guest relays only
 * its own strokes (none signed with another's identity); the staff relay the whole board. Flags
 * only from the staff.
 */
function sync(state: BoardState, { msg, from }: BoardInput): BoardState {
  if (msg.t !== 'sync' || !canDraw(from, state)) return state;
  const staff = canManageBoard(from.role);
  const strokes = staff ? msg.strokes : msg.strokes.filter((s) => s.by === from.identity);
  const merged = merge(state, strokes);
  if (!staff) return merged;
  return { ...merged, studentsCanDraw: msg.studentsCanDraw, open: msg.open, allowed: msg.allowed };
}

/** «سماح» adds one guest to the drawers, «إيقاف كتابة» takes them out (staff only). */
function allowOne(state: BoardState, { who, allow }: { who: string; allow: boolean }): BoardState {
  const others = state.allowed.filter((x) => x !== who);
  return { ...state, allowed: allow ? [...others, who] : others };
}

/**
 * The board after one message. Permissions are checked here, on receive, not only when sending:
 * a stroke must be the sender's own and the sender must be allowed to draw; clear / open belong to
 * the staff, «السماح للطلاب بالكتابة» to the teacher or admin; anything else leaves the board as is.
 */
export function boardReducer(state: BoardState, { msg, from }: BoardInput): BoardState {
  switch (msg.t) {
    case 'draw':
      return msg.stroke.by === from.identity && canDraw(from, state) ? draw(state, msg.stroke) : state;
    case 'undo':
      return undo(state, { id: msg.id, by: from.identity });
    case 'clear':
      return canManageBoard(from.role) ? { ...state, strokes: [] } : state;
    case 'perm':
      return canAllowStudents(from.role) ? { ...state, studentsCanDraw: msg.studentsCanDraw } : state;
    case 'open':
      return canManageBoard(from.role) ? { ...state, open: msg.open } : state;
    case 'allow':
      return canManageBoard(from.role) ? allowOne(state, msg) : state;
    case 'sync':
      return sync(state, { msg, from });
    default:
      return state;
  }
}

/** Answer a late joiner's sync-request? Anyone holding strokes; the staff also for the flags alone. */
export function shouldAnswerSync(state: BoardState, role: JoinRole | null): boolean {
  return state.strokes.length > 0 || (canManageBoard(role) && (state.open || state.studentsCanDraw || state.allowed.length > 0));
}
