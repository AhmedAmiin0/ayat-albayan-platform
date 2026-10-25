import type { StudentRecordingView } from '@ab/shared';
import { buttonVariants } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n';

const R = t.studentRecordings;

/**
 * The file as it is: an audio player for a sound file (the room's MP3, every recording since
 * 2026-10-06), a video player for an older MP4 room video, plus a download link.
 * `preload="none"` so a page of ten recordings fetches nothing until play; the signed link is
 * good for an hour (the list refetches before it runs out).
 */
export function RecordingPlayer({ rec, when }: { rec: StudentRecordingView; when: string }) {
  if (!rec.url) return null;
  const label = R.player.replace('{when}', when);
  return (
    <div className="grid gap-2">
      {rec.media === 'audio' ? (
        <audio controls preload="none" src={rec.url} aria-label={label} className="w-full" />
      ) : (
        <video controls preload="none" src={rec.url} aria-label={label} className="aspect-video w-full rounded-md bg-ink" playsInline />
      )}
      <a
        href={rec.url}
        download
        target="_blank"
        rel="noreferrer"
        aria-label={R.downloadOf.replace('{when}', when)}
        className={buttonVariants({ variant: 'secondary', size: 'sm' }) + ' justify-self-start'}
      >
        <Icon name="download" />
        {R.download}
      </a>
    </div>
  );
}
