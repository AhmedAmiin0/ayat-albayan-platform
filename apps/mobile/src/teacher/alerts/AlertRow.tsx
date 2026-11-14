import { type AlertAction, fillSlots } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import type { AlertRowView } from './use-today-alerts';

export interface AlertHandlers {
  onOpen: (lesson: LessonView) => void;
  onReport: (lessonId: string) => void;
  onRead: (id: string) => void;
}

const LABEL: Record<AlertAction, string> = {
  open: t.teacherAlerts.open,
  report: t.reports.open,
  read: t.teacherAlerts.markRead,
};
/** «أكمل التقرير» / «عدّل التقرير» by the report's stage (write: «اكتب التقرير»). */
const REPORT_LABEL: Partial<Record<string, string>> = {
  resume: t.reports.resume,
  window: t.reports.edit,
};

const labelOf = (row: AlertRowView): string =>
  (row.parts.action === 'report' ? REPORT_LABEL[row.parts.vars.stage ?? ''] : undefined) ??
  LABEL[row.parts.action];

type Run = (row: AlertRowView, h: AlertHandlers) => void;

function withLesson(row: AlertRowView, run: (lesson: LessonView) => void): void {
  if (row.alert.kind !== 'bell') run(row.alert.lesson);
}

/** The row's one action: the lesson sheet, the report, or «تحديد كمقروء». */
const RUN: Record<AlertAction, Run> = {
  open: (row, h) => {
    withLesson(row, h.onOpen);
  },
  report: (row, h) => {
    withLesson(row, (lesson) => {
      h.onReport(lesson.id);
    });
  },
  read: (row, h) => {
    if (row.alert.kind === 'bell') h.onRead(row.alert.item.id);
  },
};

/** The second line: the bell row's body as sent, or «السبب: …» for a change. */
const detailOf = (row: AlertRowView): string | undefined => {
  const detail = row.parts.detail ?? undefined;
  const reason = detail && row.parts.text !== 'bell';
  return reason ? fillSlots(t.teacherAlerts.reason, { reason: detail }) : detail;
};

/** One alert: what happened (and why); the whole 56pt row does its one action. */
interface AlertRowProps {
  row: AlertRowView;
  h: AlertHandlers;
  compact: boolean;
}

export function AlertRow({ row, h, compact }: AlertRowProps) {
  const { color } = useTheme();
  const label = labelOf(row);
  return (
    <ListRow
      title={row.line}
      subtitle={compact ? undefined : detailOf(row)}
      accessibilityHint={label}
      onPress={() => {
        RUN[row.parts.action](row, h);
      }}
      trailing={
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.lapis }}>
          {label}
        </AppText>
      }
    />
  );
}
