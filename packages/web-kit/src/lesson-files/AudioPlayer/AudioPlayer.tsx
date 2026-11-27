import { cn } from '@ab/web-kit/lib/utils';
import { MediaControls } from '@ab/web-kit/lesson-files/MediaControls';
import type { Props } from './AudioPlayer.types';
import { useAudioPlayer } from './use-audio-player';

/**
 * The in-browser audio player: play/pause, ±10 s, speed and the saved stop over
 * an <audio> element, the same rules as the family app's player (@ab/client-core).
 */
export function AudioPlayer({ id, url, label, className }: Props) {
  const { from, player } = useAudioPlayer({ id });
  return (
    <div className={cn('grid gap-3 rounded-lg border border-rule bg-raised p-4', className)}>
      <audio src={url} preload="metadata" aria-label={label} {...player.media}>
        <track kind="captions" />
      </audio>
      <MediaControls player={player} from={from} />
    </div>
  );
}
