import { formatClock } from '@ab/client-core';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PlayerButtons } from '@ab/web-kit/lesson-files/PlayerButtons';
import { SeekBar } from '@ab/web-kit/lesson-files/SeekBar';
import type { HtmlAudio } from '@ab/web-kit/lesson-files/use-html-audio';

const P = t.audioPlayer;

interface Props {
  player: Pick<HtmlAudio, 'state' | 'controls'>;
  /** The saved stop the player opened at (0: a new one). */
  from: number;
}

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
