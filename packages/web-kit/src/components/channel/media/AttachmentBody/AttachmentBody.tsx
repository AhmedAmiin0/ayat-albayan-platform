import type { ChannelAttachmentView, ChannelFileKind, ChannelMessageView } from '@ab/shared';
import type { ReactNode } from 'react';
import { PdfBubble } from '@ab/web-kit/components/channel/media/PdfBubble';
import { PhotoBubble } from '@ab/web-kit/components/channel/media/PhotoBubble';
import { VoiceBubble } from '@ab/web-kit/components/channel/media/VoiceBubble';

type Linked = ChannelAttachmentView & { url: string };

/** Each file kind's body (the FamChat boards). */
type Body = (m: ChannelMessageView, file: Linked) => ReactNode;
const BODIES: Readonly<Record<ChannelFileKind, Body>> = {
  photo: (m, file) => <PhotoBubble file={file} caption={m.body} />,
  pdf: (_m, file) => <PdfBubble file={file} />,
  voice: (m, file) => <VoiceBubble id={m.id} file={file} />,
};

/** A file with its signed link (none once deleted, or before the API signed it). */
const linked = (file: ChannelAttachmentView | null): file is Linked => Boolean(file?.url);

/**
 * A message's photo, PDF or voice note above its caption (until now a file showed as an empty
 * bubble on the web); a text message, or a file without its link, has none.
 */
export function AttachmentBody({ message }: { message: ChannelMessageView }) {
  const file = message.attachment;
  if (message.kind === 'text' || !linked(file)) return null;
  return <>{BODIES[message.kind](message, file)}</>;
}
