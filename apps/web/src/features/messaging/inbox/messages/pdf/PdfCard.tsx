import { type MessageView, pdfMetaLine } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { t } from '@/lib/i18n/i18n';
import type { ThreadFile } from '../../api/api';
import { threadPdfPageQuery } from '../../api/api.files';

interface PdfCardProps {
  message: MessageView;
  /** The opened PDF (W6): the card's link. */
  file: ThreadFile;
  /** Today's named link: until page 1 answers, and whenever it cannot (no preview, a render failing, …). */
  fallback: ReactNode;
}

/**
 * An opened chat PDF like WhatsApp's (owner 2026-10-29): the top of page 1, a «PDF» badge, the name
 * and «12 صفحة · PDF · 1.2 ميغابايت». A click opens the PDF itself in the browser's viewer (a new tab):
 * the web has no in-app viewer.
 */
export function PdfCard({ message: m, file, fallback }: PdfCardProps) {
  const first = useQuery(threadPdfPageQuery(m.phone_e164, m.id, 1));
  if (!first.data) return <>{fallback}</>;
  const name = m.media_name ?? t.inbox.media.document;
  const meta = pdfMetaLine(first.data, t.inbox.pdf);
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${t.inbox.pdf.open.replace('{name}', name)} · ${meta}`}
      className="block w-56 overflow-hidden rounded-md border border-rule bg-sunk hover:border-rule-strong"
    >
      <img src={first.data.url} alt="" className="h-28 w-full bg-raised object-cover object-top" />
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
