import type { LessonAssets } from '@ab/shared';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useOpenReportPdf } from './use-lesson-files';

const F = t.lessonFiles;

interface Props {
  report: LessonAssets['reports'][number];
  /** A group lesson names whose report it is. */
  named: boolean;
}

/** Made from the report, reaches the family with it, never removed here. */
export function ReportPdfItem({ report, named }: Props) {
  const open = useOpenReportPdf();
  const title = named ? `${F.reportPdf} · ${report.student_name}` : F.reportPdf;
  return (
    <li className="grid gap-1 border-b border-rule py-2 last:border-b-0">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-ink-3">{F.reportPdfNote}</p>
      {report.pdf_ready ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="justify-self-start"
          onClick={() => open.mutate(report.id)}
        >
          {F.open}
        </Button>
      ) : (
        <p className="text-xs text-ink-3">{F.notReady}</p>
      )}
      {open.isError && <FormAlert>{F.fileFailed}</FormAlert>}
    </li>
  );
}
