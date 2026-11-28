import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';

export interface KickButtonProps {
  tile: TileView;
  onAsk: (tile: TileView) => void;
}
