import { ZOOM, zoomBy } from '@ab/client-core';
import { useState } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { IconButton } from '@ab/web-kit/components/ui/form/IconButton';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const V = t.familyFiles;

/** The stage's inner height (58dvh less its padding) times the zoom; whole within it at 100 %. */
const sized = (zoom: number) => ({
  height: `calc((58dvh - 1.5rem) * ${zoom / 100})`,
  maxWidth: zoom > ZOOM.start ? 'none' : '100%',
});

/** Zoom steps a quarter; a type the browser cannot draw (HEIC outside Safari) says so. */
export function ImageView({ url, alt }: { url: string; alt: string }) {
  const [zoom, setZoom] = useState<number>(ZOOM.start);
  const [broken, setBroken] = useState(false);
  const step = (direction: 1 | -1) => () => setZoom(zoomBy(zoom, direction));
  if (broken) return <FormAlert>{t.lessonFiles.fileFailed}</FormAlert>;
  return (
    <div className="grid gap-2">
      <div className="grid h-[58dvh] overflow-auto rounded-md bg-black p-3 [place-items:safe_center]">
        <img
          src={url}
          alt={alt}
          onError={() => setBroken(true)}
          className="object-contain"
          style={sized(zoom)}
        />
      </div>
      <div className="flex items-center justify-end gap-1">
        <IconButton label={V.zoomOut} disabled={zoom <= ZOOM.min} onClick={step(-1)}>
          <Icon name="minus" />
        </IconButton>
        <Ltr className="min-w-12 text-center text-sm font-semibold tabular-nums">
          {V.zoomLevel.replace('{n}', String(zoom))}
        </Ltr>
        <IconButton label={V.zoomIn} disabled={zoom >= ZOOM.max} onClick={step(1)}>
          <Icon name="plus" />
        </IconButton>
      </div>
    </div>
  );
}
