import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';

/** One row per person: a screen tile belongs to someone already listed by their camera tile. */
export const cameraTiles = (tiles: TileView[]): TileView[] =>
  tiles.filter((x) => x.kind === 'camera');
