import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import type { ThreadFile } from './api';

const LINK = 'text-xs font-semibold text-lapis underline underline-offset-4';

export interface MediaPlayerProps {
  file: ThreadFile;
  /** «رسالة صوتية» / «فيديو»: the player's name and the fallback link's. */
  kind: string;
}

/**
 * A family's voice note or video, played in the bubble (D1). The src is pinned at mount: a refetch of
 * the signed URL never restarts playback. What the browser cannot play (AMR, 3GPP, Ogg on Safari)
 * falls back to «افتح {kind}» in a new tab.
 */
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
