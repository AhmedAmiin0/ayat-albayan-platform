import { type MessageView, pdfMetaLine } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useRef } from 'react';
import { t } from '@/lib/i18n/i18n';
import type { ThreadFile } from '../../api/api';
import { threadPdfPageQuery } from '../../api/api.files';

interface PdfCardProps {
  message: MessageView;
  /** The opened PDF (W6): the card's link. */
  file: ThreadFile;
  /** Today's named link, when page 1 cannot answer (no preview, a render still failing, …). */
  fallback: ReactNode;
}

/**
 * An opened chat PDF like WhatsApp's (owner 2026-10-29): the top of page 1, a «PDF» badge, the name
 * and «12 صفحة · PDF · 1.2 ميغابايت». A click opens the PDF itself in the browser's viewer (a new tab):
 * the web has no in-app viewer. The card shows at once (an empty strip, aria-busy, while page 1 is
 * asked), so nothing moves under the cursor after «عرض ملف»; a thumb that fails to load (its URL
 * expired in a tab left open) is asked again once.
 */
export function PdfCard({ message: m, file, fallback }: PdfCardProps) {
  const first = useQuery(threadPdfPageQuery(m.phone_e164, m.id, 1));
  const resigned = useRef(false);
  if (first.error && !first.data) return <>{fallback}</>;
  const name = m.media_name ?? t.inbox.media.document;
  const meta = first.data ? pdfMetaLine(first.data, t.inbox.pdf) : t.common.loading;
  const onError = () => {
    if (resigned.current) return;
    resigned.current = true;
    void first.refetch();
  };
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${t.inbox.pdf.open.replace('{name}', name)} · ${meta}`}
      aria-busy={!first.data}
      className="block w-56 overflow-hidden rounded-md border border-rule bg-sunk hover:border-rule-strong"
    >
      {first.data ? (
        <img src={first.data.url} alt="" onError={onError} className="h-28 w-full bg-raised object-cover object-top" />
      ) : (
        <span className="block h-28 w-full bg-raised motion-safe:animate-pulse" />
      )}
      <span className="flex items-center gap-2 p-2">
        <span className="rounded-sm bg-primary px-1.5 text-2xs font-bold text-primary-foreground">{t.inbox.pdf.type}</span>
        <span className="grid min-w-0">
          <span dir="auto" className="line-clamp-2 text-xs font-semibold text-ink [overflow-wrap:anywhere]">
            {name}
          </span>
          <span className="text-2xs text-ink-3">{meta}</span>
        </span>
      </span>
    </a>
  );
}
