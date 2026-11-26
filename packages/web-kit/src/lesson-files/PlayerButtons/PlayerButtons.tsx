import { PLAYER_SPEEDS, speedLabel, type PlayerSpeed } from '@ab/client-core';
import { useId } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { RadioChips } from '@ab/web-kit/components/ui/form/RadioChips';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { MediaGlyph, type MediaGlyphName } from '@ab/web-kit/lesson-files/MediaGlyphs';
import type { HtmlAudio } from '@ab/web-kit/lesson-files/use-html-audio';

const P = t.audioPlayer;

interface Props {
  controls: HtmlAudio['controls'];
  speed: PlayerSpeed;
  playing: boolean;
}

type SpeedKey = `${PlayerSpeed}`;
const SPEEDS = PLAYER_SPEEDS.map((s) => ({ value: `${s}` as const, label: speedLabel(s) }));
const SPEED_OF = Object.fromEntries(PLAYER_SPEEDS.map((s) => [`${s}`, s])) as Record<
  SpeedKey,
  PlayerSpeed
>;

const FACES: { glyph: MediaGlyphName; label: string; when: boolean }[] = [
  { glyph: 'play', label: P.play, when: false },
  { glyph: 'pause', label: P.pause, when: true },
];

/** Both faces share one cell and cross-fade so the width holds; the hidden face is aria-hidden. */
function PlayFace({ playing }: { playing: boolean }) {
  return (
    <span className="grid">
      {FACES.map((face) => (
        <span
          key={face.glyph}
          aria-hidden={face.when !== playing}
          className={cn(
            'col-start-1 row-start-1 inline-flex items-center justify-center gap-2',
            'transition-opacity duration-(--duration-quick) ease-ink',
            face.when !== playing && 'opacity-0',
          )}
        >
          <MediaGlyph name={face.glyph} />
          {face.label}
        </span>
      ))}
    </span>
  );
}

export function PlayerButtons({ controls, speed, playing }: Props) {
  const { skip } = controls;
  const name = useId();
  return (
    <div className="grid justify-items-center gap-3">
      <div className="flex items-center justify-center gap-3">
        <Button type="button" variant="ghost" size="sm" aria-label={P.back} onClick={() => skip(-1)}>
          <Icon name="chevron-right" />10
        </Button>
        <Button type="button" className="min-w-36" onClick={controls.toggle}>
          <PlayFace playing={playing} />
        </Button>
        <Button type="button" variant="ghost" size="sm" aria-label={P.forward} onClick={() => skip(1)}>
          10<Icon name="chevron-left" />
        </Button>
      </div>
      <RadioChips
        name={`speed-${name}`}
        legend={P.speed}
        options={SPEEDS}
        value={`${speed}`}
        onChange={(v) => controls.setSpeed(SPEED_OF[v])}
      />
    </div>
  );
}
