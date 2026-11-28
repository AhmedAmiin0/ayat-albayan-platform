import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export const M = t.classroom.mute;
export const K = t.classroom.kick;

export const shownName = (tile: TileView): string =>
  tile.isLocal ? `${tile.name} (${t.classroom.you})` : tile.name;

export const ofName = (label: string, tile: TileView): string => label.replace('{name}', tile.name);
