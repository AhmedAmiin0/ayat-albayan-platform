import { Button } from '@/components/ui/form/button';
import { Drawer } from '@/features/schedule/Drawer';
import { t } from '@/lib/i18n/i18n';
import type { MuteController } from '../mute/use-mute';
import type { TileView } from '../room/components/room-types';
import type { KickController } from './use-kick';

const M = t.classroom.mute;

interface RowProps {
  tile: TileView;
  kick: KickController;
  mute: MuteController;
}

function Row({ tile, kick, mute }: RowProps) {
  return (
    <li className="flex min-h-11 flex-wrap items-center gap-2 border-b border-rule py-2 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{tile.isLocal ? `${tile.name} (${t.classroom.you})` : tile.name}</span>
        {tile.role && <span className="text-xs text-ink-3">{t.classroom.roles[tile.role]}</span>}
      </span>
      {mute.canMute(tile, 'microphone') && (
        <Button type="button" variant="secondary" size="sm" aria-label={M.micOf.replace('{name}', tile.name)} onClick={() => mute.mute(tile, 'microphone')}>
          {M.mic}
        </Button>
      )}
      {mute.canMute(tile, 'camera') && (
        <Button type="button" variant="secondary" size="sm" aria-label={M.camOf.replace('{name}', tile.name)} onClick={() => mute.mute(tile, 'camera')}>
          {M.cam}
        </Button>
      )}
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

interface Props {
  tiles: TileView[];
  kick: KickController;
  mute: MuteController;
  onClose: () => void;
}

/** «المشاركون»: everyone with their role; «كتم الجميع», mute and «إخراج من الحلقة» where allowed. */
export function ParticipantsSheet({ tiles, kick, mute, onClose }: Props) {
  const people = tiles.filter((x) => x.kind === 'camera');
  return (
    <Drawer title={t.classroom.people} onClose={onClose}>
      {mute.canMuteAll && (
        <Button type="button" variant="secondary" size="sm" className="mb-2" onClick={mute.muteAll}>
          {M.all}
        </Button>
      )}
      <ul aria-label={t.classroom.people}>
        {people.map((tile) => (
          <Row key={tile.key} tile={tile} kick={kick} mute={mute} />
        ))}
      </ul>
    </Drawer>
  );
}
