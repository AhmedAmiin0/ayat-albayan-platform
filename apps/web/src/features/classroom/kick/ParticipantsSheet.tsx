import { Button } from '@/components/ui/button';
import { Drawer } from '@/features/schedule/Drawer';
import { t } from '@/lib/i18n';
import type { TileView } from '../room-types';
import type { KickController } from './use-kick';

function Row({ tile, kick }: { tile: TileView; kick: KickController }) {
  return (
    <li className="flex min-h-11 items-center gap-3 border-b border-rule py-2 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{tile.isLocal ? `${tile.name} (${t.classroom.you})` : tile.name}</span>
        {tile.role && <span className="text-xs text-ink-3">{t.classroom.roles[tile.role]}</span>}
      </span>
      {kick.canKick(tile) && (
        <Button
          type="button"
          variant="danger-quiet"
          size="sm"
          aria-label={t.classroom.kick.actionOf.replace('{name}', tile.name)}
          onClick={() => kick.ask(tile)}
        >
          {t.classroom.kick.action}
        </Button>
      )}
    </li>
  );
}

/** «المشاركون»: everyone in the room with their role, and «إخراج من الحلقة» where allowed. */
export function ParticipantsSheet({ tiles, kick, onClose }: { tiles: TileView[]; kick: KickController; onClose: () => void }) {
  const people = tiles.filter((x) => x.kind === 'camera');
  return (
    <Drawer title={t.classroom.people} onClose={onClose}>
      <ul aria-label={t.classroom.people}>
        {people.map((tile) => (
          <Row key={tile.key} tile={tile} kick={kick} />
        ))}
      </ul>
    </Drawer>
  );
}
