import type { ReportLine } from '@ab/client-core';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';

export type LineEdge = 'green' | 'gold' | 'teal';

const EDGE: Record<LineEdge, string> = {
  green: 'border-e-[var(--fam-edge-green)]',
  gold: 'border-e-[var(--fam-edge-gold)]',
  teal: 'border-e-[var(--fam-edge-teal)]',
};

/**
 * One line of the report (boards: the cream tiles of «محتوى الحلقة»): its label over its value
 * with a coloured end edge; a blank line says so in the quiet ink.
 */
export function LineTile({ line, edge = 'green' }: { line: ReportLine; edge?: LineEdge }) {
  return (
    <div className={cn('grid content-start gap-1 rounded-2xl border border-rule border-e-[3px]',
      'bg-sunk px-4 py-3', EDGE[edge])}>
      <dt className="text-xs font-semibold text-ink-3">{line.label}</dt>
      <dd className={cn('whitespace-pre-line text-body', line.value ? 'font-bold text-ink'
        : 'text-ink-3')}>
        {line.value ?? t.mobileAdmin.reports.noContent}
      </dd>
    </div>
  );
}
