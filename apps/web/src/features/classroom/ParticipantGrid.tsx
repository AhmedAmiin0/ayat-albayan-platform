import { t } from '@/lib/i18n';
import type { TileView } from './room-types';
import { VideoTile } from './VideoTile';

interface Props {
  tiles: TileView[];
  attach: (tileKey: string, el: HTMLVideoElement) => () => void;
}

/** Mobile first: one column at 390px, two from 640px, auto-fit above. Logical properties only. */
export function ParticipantGrid({ tiles, attach }: Props) {
  const people = tiles.filter((x) => x.kind === 'camera').length;
  return (
    <section aria-label={t.classroom.title} className="grid min-h-0 flex-1 content-start gap-3">
      <p role="status" className="text-xs text-ink-2">
        {people > 1 ? t.classroom.participants.replace('{n}', String(people)) : t.classroom.waiting}
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]">
        {tiles.map((tile) => (
          <VideoTile key={tile.key} tile={tile} attach={attach} />
        ))}
      </ul>
    </section>
  );
}
