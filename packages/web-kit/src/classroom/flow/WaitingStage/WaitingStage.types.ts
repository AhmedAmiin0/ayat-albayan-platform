import type { ReactNode } from 'react';
import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';

export interface Props {
  /** One's own camera tile, once it is there. */
  me: TileView | undefined;
  attach: (tileKey: string, el: HTMLVideoElement) => () => void;
  /** The page's countdown to the start, if it has one. */
  note?: ReactNode;
}
