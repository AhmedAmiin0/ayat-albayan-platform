import { speedLabel } from '@ab/client-core';
import { Icon } from '@/components/ui/display/icon';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import type { HtmlAudio } from './use-html-audio';

const P = t.audioPlayer;

interface Props {
  controls: HtmlAudio['controls'];
  speed: number;
  playing: boolean;
}

/** «10» back · play/pause · «10» forward · the speed (tap for the next one). */
export function PlayerButtons({ controls, speed, playing }: Props) {
  const { skip } = controls;
  return (
      <div className="flex items-center justify-center gap-3">
        <Button type="button" variant="ghost" size="sm" aria-label={P.back} onClick={() => skip(-1)}>
          <Icon name="chevron-right" />10
        </Button>
        <Button type="button" size="sm" onClick={controls.toggle}>{playing ? P.pause : P.play}</Button>
        <Button type="button" variant="ghost" size="sm" aria-label={P.forward} onClick={() => skip(1)}>
          10<Icon name="chevron-left" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={P.speedOf.replace('{speed}', speedLabel(speed))}
          onClick={controls.cycleSpeed}
        >
          {speedLabel(speed)}
        </Button>
      </div>
  );
}
