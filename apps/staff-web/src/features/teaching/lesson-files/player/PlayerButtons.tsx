import { PLAYER_SPEEDS, speedLabel, type PlayerSpeed } from '@ab/client-core';
import { useId } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { Button } from '@/components/ui/form/button';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { t } from '@/lib/i18n/i18n';
import type { HtmlAudio } from './use-html-audio';

const P = t.audioPlayer;

interface Props {
  controls: HtmlAudio['controls'];
  speed: PlayerSpeed;
  playing: boolean;
}

type SpeedKey = `${PlayerSpeed}`;
const SPEEDS = PLAYER_SPEEDS.map((s) => ({ value: `${s}` as SpeedKey, label: speedLabel(s) }));
const SPEED_OF = Object.fromEntries(PLAYER_SPEEDS.map((s) => [`${s}`, s])) as Record<
  SpeedKey,
  PlayerSpeed
>;

/** «10» back · play/pause · «10» forward, then «السرعة» as three choices 1× · 1.5× · 2×. */
export function PlayerButtons({ controls, speed, playing }: Props) {
  const { skip } = controls;
  const name = useId();
  return (
    <div className="grid justify-items-center gap-3">
      <div className="flex items-center justify-center gap-3">
        <Button type="button" variant="ghost" size="sm" aria-label={P.back} onClick={() => skip(-1)}>
          <Icon name="chevron-right" />10
        </Button>
        <Button type="button" size="sm" onClick={controls.toggle}>{playing ? P.pause : P.play}</Button>
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
