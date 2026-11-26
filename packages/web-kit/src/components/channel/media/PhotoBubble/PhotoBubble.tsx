import type { ChannelAttachmentView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PhotoViewer } from '@ab/web-kit/components/channel/media/PhotoViewer';

interface Props {
  file: ChannelAttachmentView & { url: string };
  /** The caption under the photo ('' = none): the viewer's title. */
  caption: string;
}

/**
 * A chat photo (FamChatWebThread): 240px wide at its own ratio on the sunk tone while it loads;
 * a click opens it at full size. The caption shows under it as the bubble's text.
 */
export function PhotoBubble({ file, caption }: Props) {
  const [open, setOpen] = useState(false);
  const name = caption || t.studentChannel.kinds.photo;
  return (
    <>
      <button
        type="button"
        aria-label={name}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="ab-press block w-60 max-w-full overflow-hidden rounded-md bg-sunk"
      >
        <img
          src={file.url}
          alt=""
          loading="lazy"
          className="block max-h-80 min-h-24 w-full object-cover"
        />
      </button>
      {open && <PhotoViewer url={file.url} title={name} onClose={() => setOpen(false)} />}
    </>
  );
}
