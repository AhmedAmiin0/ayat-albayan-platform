import type { TileView } from './room-types';

/**
 * - `stage`: the board (when open here) or the first shared screen takes the big area, everyone's
 *   camera (and any other screen) goes to the strip;
 * - `grid`: nothing is shared, the cameras share the space evenly.
 */
export type RoomLayout =
  | { mode: 'stage'; board: true; stage: null; strip: TileView[] }
  | { mode: 'stage'; board: false; stage: TileView; strip: TileView[] }
  | { mode: 'grid'; tiles: TileView[] };

/** Which tile goes where. With the board open here, others' shared-board videos would only repeat it. */
export function layoutOf(tiles: readonly TileView[], boardVisible: boolean): RoomLayout {
  const shown = boardVisible ? tiles.filter((x) => !x.isBoard) : [...tiles];
  if (boardVisible) return { mode: 'stage', board: true, stage: null, strip: shown };
  const stage = shown.find((x) => x.kind === 'screen');
  if (stage) return { mode: 'stage', board: false, stage, strip: shown.filter((x) => x !== stage) };
  return { mode: 'grid', tiles: shown };
}

/**
 * Balanced columns for 1 / 2 / 3–4 / 5–6 / more tiles, by the grid's own width (container
 * queries), so a narrow window and a phone get the same sensible shape. Literal class strings.
 */
export function gridColumns(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 @xl:grid-cols-2';
  if (count <= 4) return 'grid-cols-1 @md:grid-cols-2';
  if (count <= 6) return 'grid-cols-2 @4xl:grid-cols-3';
  return 'grid-cols-2 @3xl:grid-cols-3 @6xl:grid-cols-4';
}
