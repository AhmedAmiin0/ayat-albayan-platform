import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';
import { layoutOf, type RoomLayout } from '@ab/web-kit/classroom/room/livekit/stage';

const isTeacherCamera = (x: TileView): boolean =>
  !x.isLocal && x.kind === 'camera' && x.role === 'teacher';

/** Nothing shared yet and more than one person: the grid could give the teacher the stage. */
const canSpotlight = (base: RoomLayout, tiles: readonly TileView[]): boolean =>
  base.mode === 'grid' && tiles.length > 1;

/**
 * The room's layout (stage.ts), and for the family the teacher's camera on the stage while nothing
 * is shared (boards FamRoomWebLive / FamRoomPhoneLive): a screen or the board still wins.
 */
export function roomLayout(
  tiles: readonly TileView[],
  boardVisible: boolean,
  spotlight: boolean,
): RoomLayout {
  const base = layoutOf(tiles, boardVisible);
  const teacher = spotlight && canSpotlight(base, tiles) ? tiles.find(isTeacherCamera) : undefined;
  if (!teacher) return base;
  return { mode: 'stage', board: false, stage: teacher, strip: tiles.filter((x) => x !== teacher) };
}

/** Nobody else in the room yet: only one's own camera (and nothing shared). */
export const isAlone = (tiles: readonly TileView[]): boolean => tiles.every((x) => x.isLocal);

export const ownTile = (tiles: readonly TileView[]): TileView | undefined =>
  tiles.find((x) => x.isLocal);
