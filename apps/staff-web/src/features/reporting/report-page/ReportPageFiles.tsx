import type { ReportPageView } from '@ab/shared';
import { buttonVariants } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';

/** The teacher's attachments, each opening through its signed URL, then the PDF (or its wait). */
export function ReportPageFiles({ view }: { view: ReportPageView }) {
  const s = t.reportPage;
  return (
    <section className="grid gap-2" aria-label={s.files}>
      {view.attachments.length > 0 && (
        <h2 className="text-sm font-semibold text-ink-2">{s.files}</h2>
      )}
      <ul className="flex flex-wrap gap-2">
        {view.attachments.map((f, i) => (
          <li key={f.id}>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {s.file.replace('{n}', String(i + 1))}
            </a>
          </li>
        ))}
      </ul>
      {view.pdf ? (
        <a
          href={view.pdf.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonVariants()} justify-self-start`}
        >
          {s.downloadPdf}
        </a>
      ) : (
        <p className="text-sm text-ink-3">{s.pdfPending}</p>
      )}
    </section>
  );
}
