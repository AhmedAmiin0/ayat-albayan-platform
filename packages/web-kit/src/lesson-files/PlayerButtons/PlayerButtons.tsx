import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { RadioChips } from '@ab/web-kit/components/ui/form/RadioChips';
import type { Props } from './PlayerButtons.types';
import { PlayFace } from './PlayFace';
import { P, SPEEDS } from './player-buttons.helpers';
import { usePlayerButtons } from './use-player-buttons';

export function PlayerButtons({ controls, speed, playing }: Props) {
  const { name, value, back, forward, onSpeed } = usePlayerButtons({ controls, speed });
  return (
    <div className="grid justify-items-center gap-3">
      <div className="flex items-center justify-center gap-3">
        <Button type="button" variant="ghost" size="sm" aria-label={P.back} onClick={back}>
          <Icon name="chevron-right" />
          10
        </Button>
        <Button type="button" className="min-w-36" onClick={controls.toggle}>
          <PlayFace playing={playing} />
        </Button>
        <Button type="button" variant="ghost" size="sm" aria-label={P.forward} onClick={forward}>
          10
          <Icon name="chevron-left" />
        </Button>
      </div>
      <RadioChips name={name} legend={P.speed} options={SPEEDS} value={value} onChange={onSpeed} />
    </div>
  );
}
