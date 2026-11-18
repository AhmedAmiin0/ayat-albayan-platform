import type { ReportPageView } from '@ab/shared';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { pill } from '@ab/web-kit/family/brand/pill';
import { FamilyCard } from '@ab/web-kit/family/layout/FamilyCard';
import { CardHead } from '@ab/web-kit/family/pages/CardHead';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { FileButtons, type PortalFile } from '@ab/web-kit/portal/report/FileButtons';

const FILES_ID = 'report-files';

interface Props {
  view: ReportPageView;
  studentId: string;
  recording: PortalFile[];
}

/**
 * «الملفات والتسجيل» (boards: the recording card and the gold «تحميل التقرير PDF»): the teacher's
 * attachments, the visible recording by a fresh signed link, and the PDF (or its wait).
 */
export function ReportFilesCard({ view, studentId, recording }: Props) {
  const s = t.reportPage;
  return (
    <FamilyCard as="section" tone="green" labelledBy={FILES_ID} className="grid gap-4">
      <CardHead id={FILES_ID} icon="paperclip" title={t.familyLook.pages.report.files} />
      {view.attachments.length > 0 && (
        <ul aria-label={s.files} className="flex flex-wrap gap-2">
          {view.attachments.map((f, i) => (
            <li key={f.id}>
              <a href={f.url} target="_blank" rel="noopener noreferrer"
                className={pill({ tone: 'outline' })}>
                <Icon name="paperclip" />
                {s.file.replace('{n}', String(i + 1))}
              </a>
            </li>
          ))}
        </ul>
      )}
      <FileButtons studentId={studentId} files={recording} />
      {view.pdf ? (
        <a href={view.pdf.url} target="_blank" rel="noopener noreferrer"
          className={pill({ tone: 'gold', size: 'lg', className: 'w-full' })}>
          <Icon name="download" />
          {s.downloadPdf}
        </a>
      ) : (
        <p className="text-sm text-ink-3">{s.pdfPending}</p>
      )}
    </FamilyCard>
  );
}
