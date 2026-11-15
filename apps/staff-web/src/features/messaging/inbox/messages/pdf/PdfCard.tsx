import { pdfBubbleName, pdfMetaLine, type MessageView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useRef, useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { threadPdfPageQuery } from '@/features/messaging/inbox/api/api.files';
import { DownloadButton } from '@/features/messaging/inbox/messages/components/DownloadButton';
import { useOpenPdf } from './use-open-pdf';
import { useSeenOnce } from './use-seen-once';

interface PdfCardProps {
  message: MessageView;
  /** Today's «عرض ملف» (FileView), when page 1 cannot answer (no preview, a failing render…). */
  fallback: ReactNode;
}

/**
 * A chat PDF like WhatsApp's (owner 2026-10-29, 2026-11-01 «do it like WhatsApp»): the top of page
 * 1, a «PDF» badge, the name and «12 صفحة · PDF · 1.2 ميغابايت», with no click first. Every PDF (a
 * family's, an echo, an import, a forward) asks page 1 once the card has been on screen
 * (useSeenOnce); the API renders it in the ayat-pdf sandbox and keeps it. A click opens the PDF
 * itself in the browser's viewer (a new tab), signed on that click (useOpenPdf). The card holds its
 * size while it waits (an empty strip, aria-busy); a thumb that fails to load (its URL expired in a
 * tab left open) is asked again once, then the strip stays empty.
 */
export function PdfCard({ message: m, fallback }: PdfCardProps) {
  const { ref, seen } = useSeenOnce();
  const first = useQuery({ ...threadPdfPageQuery(m.phone_e164, m.id, 1), enabled: seen });
  const link = useOpenPdf(m);
  const resigned = useRef(false);
  const [broken, setBroken] = useState(false);
  if (first.error && !first.data) return <>{fallback}</>;
  const name = pdfBubbleName(m, t.inbox.pdf.untitled);
  // Never the name twice («File / File»): «PDF» until page 1 tells the count and size.
  const meta = first.data ? pdfMetaLine(first.data, t.inbox.pdf) : t.inbox.pdf.type;
  const onError = () => {
    setBroken(resigned.current);
    if (resigned.current) return;
    resigned.current = true;
    void first.refetch();
  };
  return (
    <div className="grid gap-1">
      <a
        ref={ref}
        href={link.href}
        onClick={link.onClick}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${t.inbox.pdf.open.replace('{name}', name)} · ${meta}`}
        aria-busy={!first.data}
        className="block w-56 overflow-hidden rounded-md border border-rule bg-sunk hover:border-rule-strong"
      >
        {first.data && !broken ? (
          <img src={first.data.url} alt="" onError={onError} className="h-28 w-full bg-raised object-cover object-top" />
        ) : (
          <span className={`block h-28 w-full bg-raised ${broken ? '' : 'motion-safe:animate-pulse'}`} />
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
      <DownloadButton message={m} name={name} />
    </div>
  );
}
