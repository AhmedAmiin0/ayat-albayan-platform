import { isChatViewMime, isPdfMime, isPlayableMime, type MessageView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { errorCode } from '@/features/teaching/schedule/api';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { threadFileQuery, type ThreadFile } from '../../api/api';
import { mediaKind } from '../../format';
import { DownloadButton } from './DownloadButton';
import { MediaPlayer } from './MediaPlayer';
import { PdfCard } from '../pdf/PdfCard';
import { useInboxMode } from '../../shared/mode';

/** #120: a long sent file name (media_name, up to 200 chars) wraps instead of widening the log. */
const LINK = 'text-xs font-semibold text-lapis underline underline-offset-4 [overflow-wrap:anywhere]';

/** An image the browser draws inline; HEIC is a named link like a PDF. */
const inlineImage = (mime: string): boolean => mime.startsWith('image/') && mime !== 'image/heic';

/** `forbidden`: refused to this user (teacher mode, 403), for good; else a file we do not keep yet. */
function Label({ kind, forbidden = false }: { kind: string; forbidden?: boolean }) {
  return (
    <p className="text-xs font-semibold text-ink-2">
      {kind} <span className="font-normal text-ink-3">· {forbidden ? t.inbox.mediaNotAllowed : t.inbox.mediaNotDownloaded}</span>
    </p>
  );
}

/** `fileName`: a sent file's name (media_name), the PDF link's text. */
function Loaded({ file, kind, fileName }: { file: ThreadFile; kind: string; fileName: string | null }) {
  const name = t.inbox.openMedia.replace('{kind}', kind);
  if (isPlayableMime(file.mime)) return <MediaPlayer file={file} kind={kind} />;
  if (!inlineImage(file.mime)) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className={LINK} dir="auto">
        {fileName ?? name}
      </a>
    );
  }
  return (
    <a href={file.url} target="_blank" rel="noopener noreferrer" className="block w-fit">
      <img src={file.url} alt={name} className="max-h-48 max-w-full rounded-md border border-rule object-contain" />
    </a>
  );
}

/** Asked only after the click: polling the log never signs a URL (W6). */
function FileView({ message: m, kind }: { message: MessageView; kind: string }) {
  const [asked, setAsked] = useState(false);
  const file = useQuery({ ...threadFileQuery(m.phone_e164, m.id), enabled: asked });
  if (!asked) {
    return (
      <Button size="sm" variant="ghost" className="-ms-3" onClick={() => setAsked(true)}>
        {(isPlayableMime(m.media_mime) ? t.inbox.playMedia : t.inbox.viewMedia).replace('{kind}', kind)}
      </Button>
    );
  }
  // A loaded file stays even when a background refetch fails (the error is only for no file at all).
  if (file.data) {
    const loaded = <Loaded file={file.data} kind={kind} fileName={m.media_name ?? null} />;
    return (
      <div className="grid gap-1">
        {/* A PDF: page 1 as a card like WhatsApp's (owner 2026-10-29), else today's named link. */}
        {isPdfMime(file.data.mime) ? <PdfCard message={m} file={file.data} fallback={loaded} /> : loaded}
        <DownloadButton message={m} name={m.media_name ?? kind} />
      </div>
    );
  }
  if (file.isPending) return <p className="text-xs text-ink-3">{t.common.loading}</p>;
  // 403 media_forbidden (a role that may not open files): the label, as in teacher mode.
  if (file.error instanceof ApiError && file.error.status === 403) return <Label kind={kind} forbidden />;
  return (
    <p role="status" className="text-xs font-semibold text-ink-2">
      {fileErrorText(file.error)}
    </p>
  );
}

/** 410: gone from WhatsApp; 409 crm_no_media: the number runs through the CRM, which holds its files (docs/19). */
function fileErrorText(error: unknown): string {
  if (errorCode(error) === 'crm_no_media') return t.inbox.mediaInCrm;
  return error instanceof ApiError && error.status === 410 ? t.inbox.mediaExpired : t.common.error;
}

/**
 * The file in a bubble (R-MSG-05, W6), theirs or one we sent (D2). An image or PDF opens on demand:
 * «عرض صورة» fetches a signed URL of our copy, then a thumbnail (full size in a new tab) or a named
 * link; a voice note or video «تشغيل رسالة صوتية» plays in the bubble (D1). Other files (stickers,
 * locations…) keep their label. Teacher mode gets the label only: the API refuses them the file
 * (403 media_forbidden).
 */
export function MessageMedia({ message: m }: { message: MessageView }) {
  const kind = t.inbox.media[mediaKind(m.media_mime)];
  const teacher = useInboxMode() === 'teacher';
  if (m.media_url) {
    return (
      <a href={m.media_url} target="_blank" rel="noopener noreferrer" className={LINK}>
        {t.inbox.openMedia.replace('{kind}', kind)}
      </a>
    );
  }
  if (!teacher && isChatViewMime(m.media_mime)) return <FileView message={m} kind={kind} />;
  return <Label kind={kind} forbidden={teacher} />;
}
