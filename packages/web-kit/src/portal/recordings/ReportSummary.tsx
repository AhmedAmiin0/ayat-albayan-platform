import { useQuery } from '@tanstack/react-query';
import { SectionHeader } from '#/components/ui/surface/index.ts';
import { reportLines, reportPageByIdQuery } from '#/report/index.ts';
import { t } from '#/lib/i18n/index.ts';

/** How many of the report's lines the lesson page shows before «اقرأ التقرير كاملًا». */
const SUMMARY_LINES = 5;

/**
 * «من تقرير هذه الحلقة»: the report's first filled lines (attendance, memorization, grade…), two
 * to a row where the card is wide enough.
 */
export function ReportSummary({ reportId }: { reportId: string }) {
  const page = useQuery(reportPageByIdQuery(reportId));
  if (!page.data) return null;
  const lines = reportLines(page.data.report).filter((l) => l.value).slice(0, SUMMARY_LINES);
  return (
    <section aria-label={t.lessonFiles.reportSummary} className="@container grid gap-2">
      <SectionHeader level={3} title={t.lessonFiles.reportSummary} />
      <dl className="grid gap-3 @md:grid-cols-2">
        {lines.map((l) => (
          <div key={l.key} className="grid gap-0.5">
            <dt className="text-xs text-ink-3">{l.label}</dt>
            <dd className="whitespace-pre-line text-sm text-ink">{l.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
