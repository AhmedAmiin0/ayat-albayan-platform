import { Avatar } from '@ab/web-kit/components/ui/display/avatar';
import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { roleWord, type RoomVariant } from '@ab/web-kit/classroom/flow/room-variant';
import type { TileView } from '@ab/web-kit/classroom/room/components/room-types';

const nameOf = (tile: TileView): string =>
  tile.isLocal ? `${tile.name} (${t.classroom.you})` : tile.name;

function Row({ tile, variant }: { tile: TileView; variant: RoomVariant }) {
  return (
    <li className="flex min-h-14 items-center gap-3 border-b border-rule py-2 last:border-b-0">
      <Avatar name={tile.name} id={tile.identity} size="md" decorative />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{nameOf(tile)}</span>
        <span className="text-xs text-ink-2">{roleWord(variant, tile.role)}</span>
      </span>
      {tile.speaking && <span className="text-xs font-semibold text-ink">{t.classroom.speaking}</span>}
      {!tile.micOn && (
        <span className="flex items-center gap-1 text-xs text-ink-2">
          <NuqtaGlyph shape="struck" />
          {t.classroom.muted}
        </span>
      )}
      {!tile.hasVideo && <span className="text-xs text-ink-2">{t.mobileRoom.preview.camOff}</span>}
    </li>
  );
}

/** Read only for the family; mic and camera state in words. */
export function PeopleList({ tiles, variant }: { tiles: TileView[]; variant: RoomVariant }) {
  const people = tiles.filter((x) => x.kind === 'camera');
  return (
    <ul aria-label={t.classroom.people} className="px-4">
      {people.map((tile) => (
        <Row key={tile.key} tile={tile} variant={variant} />
      ))}
    </ul>
  );
}
