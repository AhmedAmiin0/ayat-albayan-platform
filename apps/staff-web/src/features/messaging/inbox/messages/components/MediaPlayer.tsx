import { useState } from 'react';
import { t } from '@ab/web-kit';
import type { ThreadFile } from '@ab/shared';

const LINK = 'text-xs font-semibold text-lapis underline underline-offset-4';

export interface MediaPlayerProps {
  file: ThreadFile;
  kind: string;
}

/** The src is pinned at mount so a signed-URL refetch never restarts playback. */
export function MediaPlayer({ file, kind }: MediaPlayerProps) {
  const [src] = useState(file.url);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className={LINK}>
        {t.inbox.openMedia.replace('{kind}', kind)}
      </a>
    );
  }
  const onError = () => setFailed(true);
  if (file.mime.startsWith('video/')) {
    return (
      <video
        src={src}
        controls
        playsInline
        autoPlay
        preload="metadata"
        aria-label={kind}
        onError={onError}
        className="max-h-72 max-w-full rounded-md"
      />
    );
  }
  return <audio src={src} controls autoPlay preload="metadata" aria-label={kind} onError={onError} className="w-64 max-w-full" />;
}
