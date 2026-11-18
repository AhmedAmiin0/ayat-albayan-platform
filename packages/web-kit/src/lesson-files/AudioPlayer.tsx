import { formatClock, resumeAt } from '@ab/client-core';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { PlayerButtons } from './PlayerButtons';
import { SeekBar } from './SeekBar';
import { useHtmlAudio } from './use-html-audio';
import { useResumeMap } from './use-resume';

const P = t.audioPlayer;

/**
 * The family look (board PortalWebRecordings): the player on the emerald band in three columns,
 * the play disc beside the bar, then ±10 s around the speeds, then the saved stop. `family:` only,
 * so staff's player keeps its look.
 */
const FAM_BAND =
  'family:grid-cols-[auto_minmax(0,1fr)_auto] family:items-center family:gap-x-3 family:rounded-[18px] family:border-0 family:bg-[image:var(--fam-hero)] family:text-fam-hero-ink';

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
    <div className={cn('grid gap-3 rounded-lg border border-rule bg-raised p-4', FAM_BAND)}>
      <audio src={url} preload="metadata" aria-label={label} {...media}>
        <track kind="captions" />
      </audio>
      {from > 0 && state.position > 0 && (
        <p
          className="flex items-center justify-between text-xs text-ink-3 family:text-sm
            family:font-semibold family:text-fam-hero-ink-2 family:col-span-3 family:row-start-3"
        >
          <span>
            {P.resumeFrom.replace('{at}', '')}
            <Ltr>{formatClock(from)}</Ltr>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="family:text-fam-gold family:hover:not-disabled:bg-white/10"
            onClick={controls.startOver}
          >
            {P.startOver}
          </Button>
        </p>
      )}
      <SeekBar position={state.position} duration={state.duration} seek={controls.seek} />
      <PlayerButtons controls={controls} speed={state.speed} playing={playing} />
      {state.status === 'failed' && (
        <FormAlert className="family:col-span-3">{P.failed}</FormAlert>
      )}
    </div>
  );
}
