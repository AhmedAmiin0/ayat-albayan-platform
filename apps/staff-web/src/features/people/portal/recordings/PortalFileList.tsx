import type { PortalLessonFile } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { fileLine, fileTitle } from '@/features/teaching/lesson-files';
import { FileButtons } from '@/features/people/portal/report/FileButtons';
import { t } from '@/lib/i18n/i18n';
import { VoiceNotePlayer } from './RecordingPlayer';
import { useOpenLessonFile } from './use-recordings';

const F = t.lessonFiles;

interface Props {
  studentId: string;
  /** The sent report: its PDF is the list's first file. */
  reportId: string | null;
  files: readonly PortalLessonFile[];
}

/**
 * «ملفات الحلقة · 4» for the family: the report's PDF first, then a voice note plays here and a
 * picture or PDF opens in a new tab.
 */
export function PortalFileList({ studentId, reportId, files }: Props) {
  const open = useOpenLessonFile(studentId);
  const count = files.length + (reportId ? 1 : 0);
  if (count === 0) return null;
  return (
    <section aria-label={F.title} className="grid gap-2">
      <h3 className="text-sm font-bold">{F.header.replace('{n}', String(count))}</h3>
      <ul className="grid gap-3">
        {reportId && (
          <li className="grid gap-1">
            <p className="text-sm font-semibold">{F.reportPdf}</p>
            <FileButtons studentId={studentId} files={[{ kind: 'reports', id: reportId }]} />
          </li>
        )}
        {files.map((file) => (
          <li key={file.id} className="grid gap-1">
            <p className="text-sm font-semibold">{fileTitle(file)}</p>
            <p className="text-xs text-ink-3">{fileLine(file)}</p>
            {file.media === 'audio' ? (
              <VoiceNotePlayer studentId={studentId} id={file.id} />
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="justify-self-start"
                onClick={() => open.mutate(file.id)}
              >
                {F.open}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {open.isError && <FormAlert>{F.fileFailed}</FormAlert>}
    </section>
  );
}
