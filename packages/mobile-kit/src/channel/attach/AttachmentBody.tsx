import type { ChannelAttachmentView, ChannelFileKind, ChannelMessageView } from '@ab/shared';
import type { ReactNode } from 'react';
import { PdfBubble } from './PdfBubble';
import { PhotoBubble } from './PhotoBubble';
import { VoiceBubble } from './VoiceBubble';

interface FileView {
  id: string;
  file: ChannelAttachmentView;
  url: string;
}

/** Each file kind's view in the bubble. */
const VIEWS: Readonly<Record<ChannelFileKind, (v: FileView) => ReactNode>> = {
  photo: (v) => <PhotoBubble url={v.url} />,
  pdf: (v) => <PdfBubble file={v.file} url={v.url} />,
  voice: (v) => <VoiceBubble id={v.id} url={v.url} durationMs={v.file.duration_ms} />,
};

/** A message's photo, PDF or voice note; nothing for text or a file without its link. */
export function AttachmentBody({ message: m }: { message: ChannelMessageView }) {
  const url = m.attachment?.url;
  if (!m.attachment || !url || m.kind === 'text') return null;
  return VIEWS[m.kind]({ id: m.id, file: m.attachment, url });
}
