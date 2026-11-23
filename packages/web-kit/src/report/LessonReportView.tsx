import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ListSkeleton } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { reportPageByIdQuery } from './api';
import { ReportPageBody } from './ReportPageBody';

interface Props {
  reportId: string;
  /** The page header (names, date): off inside a lesson row, on for a family's report screen. */
  head?: boolean;
  /** Shown instead of the quiet error line when the page cannot be read. */
  fallback?: ReactNode;
}

/**
 * One lesson's saved report, read-only: the lines, the «edited» note, the attachments and the PDF.
 * Inside its row of the teacher's student file (docs/49) the page header is left out (the row
 * already says which lesson it is); the family's report screen (docs/50) shows it.
 */
export function LessonReportView({ reportId, head = false, fallback }: Props) {
  const page = useQuery(reportPageByIdQuery(reportId));
  if (page.isError) return fallback ?? <p className="text-sm text-ink-3">{t.common.error}</p>;
  if (!page.data) return <ListSkeleton rows={2} />;
  return <ReportPageBody view={page.data} head={head} />;
}
