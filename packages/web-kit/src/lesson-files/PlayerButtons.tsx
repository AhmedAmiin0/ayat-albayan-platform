import { PLAYER_SPEEDS, speedLabel, type PlayerSpeed } from '@ab/client-core';
import { useId } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { RadioChips } from '@ab/web-kit/components/ui/form/radio-chips';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PlayGlyph } from '@ab/web-kit/components/family/panels/PlayGlyph';
import { cn } from '@ab/web-kit/lib/utils';
import type { HtmlAudio } from './use-html-audio';

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

/** On the family's emerald band: white skip buttons and speed chips, the picked speed in gold. */
const FAM_SKIP = 'family:row-start-2 family:px-2 family:text-fam-hero-ink family:hover:not-disabled:bg-white/10';
const FAM_SPEED =
  'contents family:col-start-2 family:row-start-2 family:flex family:justify-center family:[&_legend]:sr-only family:[&_fieldset]:min-w-0 family:[&_label>span]:min-h-11 family:[&_label>span]:rounded-full family:[&_label>span]:border-white/30 family:[&_label>span]:px-2.5 family:[&_div]:gap-1.5 family:[&_label>span]:text-fam-hero-ink family:[&_label>span:hover]:bg-white/10 family:[&_input:checked+span]:border-transparent family:[&_input:checked+span]:bg-[image:var(--fam-gold-fill)] family:[&_input:checked+span]:text-fam-on-gold';
const FAM_PLAY =
  'family:col-start-1 family:row-start-1 family:size-14 family:min-h-14 family:p-0 family:bg-[image:var(--fam-gold-fill)] family:text-fam-on-gold family:shadow-[0_8px_20px_rgba(212,165,55,0.35)] family:sm:min-h-14';

/**
 * «10» back · play/pause · «10» forward, then «السرعة» as three choices 1× · 1.5× · 2×. The family
 * look lays them into the player's band: the gold play disc (its word kept for screen readers)
 * beside the bar, «10» · the speeds · «10» under it.
 */
export function PlayerButtons({ controls, speed, playing }: Props) {
  const { skip } = controls;
  const name = useId();
  return (
    <div className="grid justify-items-center gap-3 family:contents">
      <div className="flex items-center justify-center gap-3 family:contents">
        <Button type="button" variant="ghost" size="sm" aria-label={P.back}
          className={cn(FAM_SKIP, 'family:col-start-1')} onClick={() => skip(-1)}>
          <Icon name="chevron-right" />10
        </Button>
        <Button type="button" size="sm" className={FAM_PLAY} onClick={controls.toggle}>
          <PlayGlyph playing={playing} className="hidden family:block family:size-6" />
          <span className="family:sr-only">{playing ? P.pause : P.play}</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" aria-label={P.forward}
          className={cn(FAM_SKIP, 'family:col-start-3')} onClick={() => skip(1)}>
          10<Icon name="chevron-left" />
        </Button>
      </div>
      <div className={FAM_SPEED}>
        <RadioChips
          name={`speed-${name}`}
          legend={P.speed}
          options={SPEEDS}
          value={`${speed}`}
          onChange={(v) => controls.setSpeed(SPEED_OF[v])}
        />
      </div>
    </div>
  );
}
