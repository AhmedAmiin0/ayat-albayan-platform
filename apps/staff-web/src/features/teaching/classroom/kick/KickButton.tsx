import { IconButton } from '@/components/ui/form/icon-button';
import { t } from '@/lib/i18n/i18n';
import { RoomIcon } from '@/features/teaching/classroom/room/components/room-icons';
import type { TileView } from '@/features/teaching/classroom/room/components/room-types';

/** The tile's corner «إخراج من الحلقة» (named for the person); the confirm dialog follows. */
export function KickButton({ tile, onAsk }: { tile: TileView; onAsk: (tile: TileView) => void }) {
  return (
    <IconButton
      label={t.classroom.kick.actionOf.replace('{name}', tile.name)}
      title={t.classroom.kick.action}
      onClick={() => onAsk(tile)}
      className="bg-inverse/85 text-on-inverse hover:bg-danger-soft hover:text-danger"
    >
      <RoomIcon name="kick" />
    </IconButton>
  );
}
