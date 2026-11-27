import { formatClock } from '@ab/client-core';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { PlayerButtons } from '@ab/web-kit/lesson-files/PlayerButtons';
import { SeekBar } from '@ab/web-kit/lesson-files/SeekBar';
import type { Props } from './MediaControls.types';
import { P } from './media-controls.helpers';

/** The resume hint fades in once the stop is known. */
export function MediaControls({ player, from }: Props) {
  const { state, controls } = player;
  return (
    <>
      {from > 0 && state.position > 0 && (
        <p className="flex animate-fade-in items-center justify-between text-xs text-ink-3">
          <span>
            {P.resumeFrom.replace('{at}', '')}
            <Ltr>{formatClock(from)}</Ltr>
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={controls.startOver}>
            {P.startOver}
          </Button>
        </p>
      )}
      <SeekBar position={state.position} duration={state.duration} seek={controls.seek} />
      <PlayerButtons controls={controls} speed={state.speed} playing={state.status === 'playing'} />
      {state.status === 'failed' && <FormAlert>{P.failed}</FormAlert>}
    </>
  );
}
