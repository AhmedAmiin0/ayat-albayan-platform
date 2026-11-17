import { formatClock, resumeAt } from '@ab/client-core';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { PlayerButtons } from './PlayerButtons';
import { SeekBar } from './SeekBar';
import { useHtmlAudio } from './use-html-audio';
import { useResumeMap } from './use-resume';

const P = t.audioPlayer;

interface Props {
  /** The recording's or file's id: its saved stop. */
  id: string;
  /** A signed link (an hour). */
  url: string;
  label: string;
}

/**
 * The in-browser audio player (owner 2026-11-17): play/pause, ±10 s, speed and the saved stop over
 * an <audio> element, the same rules as the family app's player (@ab/client-core).
 */
export function AudioPlayer({ id, url, label }: Props) {
  const from = resumeAt(useResumeMap(), id);
  const { media, state, controls } = useHtmlAudio({ id, startAt: from });
  const playing = state.status === 'playing';
  return (
    <div className="grid gap-3 rounded-lg border border-rule bg-raised p-4">
      <audio src={url} preload="metadata" aria-label={label} {...media}>
        <track kind="captions" />
      </audio>
      {from > 0 && state.position > 0 && (
        <p className="flex items-center justify-between text-xs text-ink-3">
          <span>{P.resumeFrom.replace('{at}', formatClock(from))}</span>
          <Button type="button" variant="ghost" size="sm" onClick={controls.startOver}>
            {P.startOver}
          </Button>
        </p>
      )}
      <SeekBar position={state.position} duration={state.duration} seek={controls.seek} />
      <PlayerButtons controls={controls} speed={state.speed} playing={playing} />
      {state.status === 'failed' && <FormAlert>{P.failed}</FormAlert>}
    </div>
  );
}
