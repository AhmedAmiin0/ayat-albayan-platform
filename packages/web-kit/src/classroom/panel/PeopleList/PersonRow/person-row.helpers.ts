import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export const shownName = (tile: TileView): string =>
  tile.isLocal ? `${tile.name} (${t.classroom.you})` : tile.name;
