import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { NewMark } from '@ab/web-kit/portal/history/HistoryRow/NewMark';
import type { ReportActionProps } from './ReportAction.types';
import { useReportAction } from './use-report-action';

/** Marked new until opened here; the recording rides with it. */
export function ReportAction({ row, onOpenReport, onOpenLesson }: ReportActionProps) {
  const { reportId, isNew, open } = useReportAction({ row, onOpenReport });
  if (!reportId) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={() => open(reportId)}>
        {t.portal.openReport}
      </Button>
      {isNew(reportId) && <NewMark />}
      {onOpenLesson && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onOpenLesson(row.lesson_id)}>
          <Icon name="template" />
          {t.lessonFiles.title}
        </Button>
      )}
    </div>
  );
}
