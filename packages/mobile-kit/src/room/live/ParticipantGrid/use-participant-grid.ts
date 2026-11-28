import { useState } from 'react';
import { gridRows } from '../../model/room-grid';
import type { TileActions } from '../ParticipantTile';
import type { ParticipantGridProps } from './ParticipantGrid.types';

export function useParticipantGrid({
  tiles,
  actions,
}: Pick<ParticipantGridProps, 'tiles' | 'actions'>) {
  const [zoomed, setZoomed] = useState<string | null>(null);
  const big = tiles.find((x) => x.screen && x.key === zoomed);
  const rows = big ? [[big]] : gridRows(tiles);
  const alone = tiles.filter((x) => !x.screen).length <= 1;
  const tileActions: TileActions = {
    ...actions,
    zoomed: big ? big.key : null,
    zoom: (key) => setZoomed((was) => (was === key ? null : key)),
  };
  return { big, rows, alone, tileActions };
}
