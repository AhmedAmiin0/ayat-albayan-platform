import type { ChannelAttachmentView, ChannelFileKind, ChannelMessageView } from '@ab/shared';
import type { ReactNode } from 'react';
import { PdfBubble } from './PdfBubble';
import { PhotoBubble } from './PhotoBubble';
import { VoiceBubble } from './VoiceBubble';

interface FileView {
  id: string;
  file: ChannelAttachmentView;
  url: string;
  /** The message's menu: a long press on the file opens it too (ChatXMenu). */
  onLongPress?: () => void;
}

/** Each file kind's view in the bubble. */
const VIEWS: Readonly<Record<ChannelFileKind, (v: FileView) => ReactNode>> = {
  photo: (v) => <PhotoBubble url={v.url} onLongPress={v.onLongPress} />,
  pdf: (v) => <PdfBubble file={v.file} url={v.url} onLongPress={v.onLongPress} />,
  voice: (v) => (
    <VoiceBubble
      id={v.id}
      url={v.url}
      durationMs={v.file.duration_ms}
      onLongPress={v.onLongPress}
    />
  ),
};

interface AttachmentBodyProps {
  message: ChannelMessageView;
  onLongPress?: () => void;
}

/** A message's photo, PDF or voice note; nothing for text or a file without its link. */
export function AttachmentBody({ message: m, onLongPress }: AttachmentBodyProps) {
  const url = m.attachment?.url;
  if (!m.attachment || !url || m.kind === 'text') return null;
  return VIEWS[m.kind]({ id: m.id, file: m.attachment, url, onLongPress });
}
