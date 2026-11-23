import { IconButton } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { RoomIcon } from '#/classroom/room/components/room-icons.tsx';
import type { TileView } from '#/classroom/room/components/room-types.ts';

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
