import type { RoomTile } from './room-types';

/**
 * Shared screens first (viewing only), then the others, then oneself last: the others matter most.
 */
export function orderTiles(tiles: readonly RoomTile[]): RoomTile[] {
  const rank = (t: RoomTile) => (t.screen ? 0 : t.local ? 2 : 1);
  return [...tiles].sort((a, b) => rank(a) - rank(b));
}

/** One column for one or two people (stacked on a portrait phone), two above that. */
export const gridColumns = (count: number): number => (count <= 2 ? 1 : 2);

/** The tiles in rows: a shared screen takes a whole row, the cameras fill `gridColumns` per row. */
export function gridRows(tiles: readonly RoomTile[]): RoomTile[][] {
  const ordered = orderTiles(tiles);
  const screens = ordered.filter((t) => t.screen).map((t) => [t]);
  const cams = ordered.filter((t) => !t.screen);
  const cols = gridColumns(cams.length);
  const rows: RoomTile[][] = [];
  for (let i = 0; i < cams.length; i += cols) rows.push(cams.slice(i, i + cols));
  return [...screens, ...rows];
}
