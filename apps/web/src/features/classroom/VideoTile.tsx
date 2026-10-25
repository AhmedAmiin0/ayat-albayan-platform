import { useEffect, useRef, type ReactNode } from 'react';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { TileView } from './room-types';

interface Props {
  tile: TileView;
  attach: (tileKey: string, el: HTMLVideoElement) => () => void;
  /** A corner action, e.g. «إخراج من الحلقة». */
  action?: ReactNode;
  className?: string;
}

const label = (tile: TileView): string => {
  if (tile.isBoard) return t.classroom.boardOf.replace('{name}', tile.name);
  if (tile.kind === 'screen') return t.classroom.screenOf.replace('{name}', tile.name);
  return tile.isLocal ? `${tile.name} (${t.classroom.you})` : tile.name;
};

/** One person (or one shared screen). Speaking = gold ring + the word; muted = struck glyph + the word. */
export function VideoTile({ tile, attach, action, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    return tile.hasVideo && el ? attach(tile.key, el) : undefined;
  }, [tile.key, tile.hasVideo, tile.videoRev, attach]);

  const mirrored = tile.isLocal && tile.kind === 'camera';
  return (
    <li
      data-speaking={tile.speaking}
      aria-label={label(tile)}
      className={cn(
        'relative grid min-h-40 place-items-center overflow-hidden rounded-md border border-rule-strong bg-inverse text-on-inverse',
        tile.speaking && 'outline-3 outline-gold',
        className,
      )}
    >
      {tile.hasVideo ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className={cn('size-full object-cover', tile.kind === 'screen' && 'object-contain', mirrored && '-scale-x-100')}
        />
      ) : (
        <span aria-hidden="true" className="font-display text-5xl text-inverse-gold">
          {tile.name.trim().charAt(0)}
        </span>
      )}
      {action && <span className="absolute inset-e-1.5 top-1.5">{action}</span>}
      <span className="absolute inset-s-2 bottom-2 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md bg-inverse/85 px-2 py-0.5 text-xs">
        <span className="truncate">{label(tile)}</span>
        {tile.kind === 'camera' && !tile.micOn && (
          <span className="flex items-center gap-1">
            <NuqtaGlyph shape="struck" />
            {t.classroom.muted}
          </span>
        )}
        {tile.speaking && (
          <span className="flex items-center gap-1 text-inverse-gold">
            <NuqtaGlyph shape="fill" />
            {t.classroom.speaking}
          </span>
        )}
      </span>
    </li>
  );
}
