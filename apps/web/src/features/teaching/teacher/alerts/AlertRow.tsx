import { type AlertAction, fillSlots, type ReportStage } from '@ab/client-core';
import { type ReactNode, useId } from 'react';
import { Button } from '@/components/ui/form/button';
import { useMarkRead } from '@/features/messaging/notifications';
import { REPORT_STAGE_LABEL, ReportLink, reportFormHref } from '@/features/reporting/reports';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import type { AlertRowView } from './use-today-alerts';

export interface AlertRowProps {
  row: AlertRowView;
  compact: boolean;
  onOpen: (lessonId: string) => void;
}

/** The row's line id: every action is described by its own row («افتح الحلقة» × 3). */
type Act = (p: AlertRowProps & { lineId: string }) => ReactNode;

const stageOf = (row: AlertRowView): ReportStage =>
  row.parts.vars.stage === 'resume' || row.parts.vars.stage === 'window' ? row.parts.vars.stage : 'write';

/** The row's one action (owner 2026-11-14): the lesson drawer, the report, or «تحديد كمقروء». */
const ACTIONS: Record<AlertAction, Act> = {
  open: (p) => (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      aria-describedby={p.lineId}
      onClick={() => p.onOpen(p.row.lessonId ?? '')}
    >
      {t.teacherAlerts.open}
    </Button>
  ),
  report: (p) => (
    <ReportLink href={reportFormHref({ role: 'teacher', lessonId: p.row.lessonId ?? '', studentId: '' })}>
      {REPORT_STAGE_LABEL[stageOf(p.row)]}
    </ReportLink>
  ),
  read: (p) => <MarkRead id={p.row.bellId ?? ''} lineId={p.lineId} />,
};

function MarkRead({ id, lineId }: { id: string; lineId: string }) {
  const mark = useMarkRead();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-describedby={lineId}
      disabled={mark.isPending}
      onClick={() => mark.mutate([id])}
    >
      {t.teacherAlerts.markRead}
    </Button>
  );
}

/** The second line: the bell row's body as sent, or «السبب: …» for a change. */
const detailOf = (row: AlertRowView): string | null =>
  row.parts.detail && row.parts.text !== 'bell'
    ? fillSlots(t.teacherAlerts.reason, { reason: row.parts.detail })
    : row.parts.detail;

/** One alert: what happened (and why), then its one action at the inline-end. */
export function AlertRow(props: AlertRowProps) {
  const { row, compact } = props;
  const detail = detailOf(row);
  const lineId = useId();
  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule last:border-b-0',
        compact ? 'py-1' : 'py-2.5',
      )}
    >
      <span className="grid min-w-0 flex-[1_1_14rem] gap-0.5">
        <span id={lineId} className="text-sm font-semibold text-pretty">{row.line}</span>
        {detail && <span className={cn('text-xs text-ink-2', compact && 'truncate')}>{detail}</span>}
      </span>
      <span className="shrink-0">{ACTIONS[row.parts.action]({ ...props, lineId })}</span>
    </li>
  );
}
