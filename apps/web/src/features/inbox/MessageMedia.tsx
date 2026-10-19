import { INVOICE_MIMES, type MessageView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { threadFileQuery, type ThreadFile } from './api';
import { mediaKind } from './format';
import { useInboxMode } from './mode';

const LINK = 'text-xs font-semibold text-lapis underline underline-offset-4';

/** «image/jpeg; codecs=…» → «image/jpeg», as the API reads it (InboundMedia.baseMime). */
const baseMime = (mime: string | null): string => mime?.split(';')[0]?.trim().toLowerCase() ?? '';
/** The files WhatsApp lets us fetch and keep: images and PDFs (InboundMedia's INVOICE_MIMES). */
const viewable = (mime: string | null): boolean => (INVOICE_MIMES as readonly string[]).includes(baseMime(mime));
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

function Loaded({ file, kind }: { file: ThreadFile; kind: string }) {
  const name = t.inbox.openMedia.replace('{kind}', kind);
  if (!inlineImage(file.mime)) {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer" className={LINK}>
        {name}
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
        {t.inbox.viewMedia.replace('{kind}', kind)}
      </Button>
    );
  }
  // A loaded file stays even when a background refetch fails (the error is only for no file at all).
  if (file.data) return <Loaded file={file.data} kind={kind} />;
  if (file.isPending) return <p className="text-xs text-ink-3">{t.common.loading}</p>;
  // 403 media_forbidden (a role that may not open files): the label, as in teacher mode.
  if (file.error instanceof ApiError && file.error.status === 403) return <Label kind={kind} forbidden />;
  const expired = file.error instanceof ApiError && file.error.status === 410;
  return (
    <p role="status" className="text-xs font-semibold text-ink-2">
      {expired ? t.inbox.mediaExpired : t.common.error}
    </p>
  );
}

/**
 * The file in a bubble (R-MSG-05, W6). A family's image or PDF opens on demand: «عرض صورة» fetches a
 * signed URL of our copy, then a thumbnail (full size in a new tab) or a named link. Other files
 * (voice notes, videos) keep their label until they can be stored too. Teacher mode gets the label
 * only: the API refuses them the file (403 media_forbidden).
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
  if (!teacher && m.direction === 'inbound' && viewable(m.media_mime)) return <FileView message={m} kind={kind} />;
  return <Label kind={kind} forbidden={teacher} />;
}
