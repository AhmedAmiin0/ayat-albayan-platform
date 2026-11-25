import { isGifMessage, isStickerMessage, STICKER_SIZE, type MessageView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { t } from '@ab/web-kit';
import { threadFileQuery } from '@/features/messaging/inbox/api/api';

// Signed as the bubble renders rather than on click, since a sticker or GIF is only itself.

type Kind = 'sticker' | 'gif';

/** A sticker or a GIF bubble, staff only (a teacher keeps the label: the API refuses the file). */
export function stickerOrGif(m: MessageView, teacher: boolean): Kind | null {
  if (teacher) return null;
  if (isStickerMessage(m)) return 'sticker';
  return isGifMessage(m) ? 'gif' : null;
}

const STICKER_BOX = { width: STICKER_SIZE, height: STICKER_SIZE };

/** Until the file is signed: the box it takes (the log never jumps), or why it failed. */
function Pending({ failed, kind }: { failed: boolean; kind: Kind }) {
  if (failed) return <p className="text-xs font-semibold text-ink-2">{t.common.error}</p>;
  const size = kind === 'sticker' ? 'size-[150px]' : 'h-40 w-56 rounded-md bg-sunk';
  return <div aria-hidden="true" className={size} />;
}

/** A GIF plays muted and looping because WhatsApp sends it as an mp4 video. */
export function StickerMedia({ message: m, kind }: { message: MessageView; kind: Kind }) {
  const file = useQuery(threadFileQuery(m.phone_e164, m.id));
  if (!file.data) return <Pending failed={file.isError} kind={kind} />;
  if (kind === 'sticker') {
    return <img src={file.data.url} alt={t.inbox.media.sticker} style={STICKER_BOX} className="object-contain" />;
  }
  return (
    <video
      src={file.data.url}
      aria-label={t.inbox.media.gif}
      autoPlay
      muted
      loop
      playsInline
      className="max-h-60 max-w-full rounded-md"
    />
  );
}
