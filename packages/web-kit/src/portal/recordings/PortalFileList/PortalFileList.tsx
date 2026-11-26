import type { PortalLessonFile } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { SectionHeader } from '@ab/web-kit/components/ui/surface/section-header';
import { Button } from '@ab/web-kit/components/ui/form/Button';
import { fileLine, fileTitle } from '@ab/web-kit/lesson-files/file-words';
import { FileButtons } from '@ab/web-kit/portal/report/FileButtons';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { VoiceNotePlayer } from '@ab/web-kit/portal/recordings/RecordingPlayer';
import { FileViewer } from '@ab/web-kit/portal/recordings/viewer/FileViewer';

const F = t.lessonFiles;

interface Props {
  studentId: string;
  /** The sent report: its PDF is the list's first file. */
  reportId: string | null;
  files: readonly PortalLessonFile[];
}

/** One item: the name and its line at the start, its button at the end (wraps on a phone). */
function Item({ title, line, action }: { title: string; line?: string; action: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="grid min-w-0 gap-0.5">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {line && <p className="text-xs text-ink-3">{line}</p>}
      </div>
      {action}
    </div>
  );
}

/** The report's PDF first; a voice note plays here, a picture or PDF opens in the page viewer. */
export function PortalFileList({ studentId, reportId, files }: Props) {
  const [viewing, setViewing] = useState<string | null>(null);
  const count = files.length + (reportId ? 1 : 0);
  if (count === 0) return null;
  const open = (id: string) => (
    <Button type="button" variant="secondary" size="sm" onClick={() => setViewing(id)}>
      {F.open}
    </Button>
  );
  return (
    <section aria-label={F.title} className="grid gap-2">
      <SectionHeader level={3} title={F.header.replace('{n}', String(count))} />
      <ul className="grid divide-y divide-rule">
        {reportId && (
          <li className="py-3 first:pt-0">
            <Item title={F.reportPdf} action={
              <FileButtons studentId={studentId} files={[{ kind: 'reports', id: reportId }]} />
            } />
          </li>
        )}
        {files.map((file) => (
          <li key={file.id} className="grid gap-3 py-3 first:pt-0">
            <Item title={fileTitle(file)} line={fileLine(file)}
              action={file.media === 'audio' ? null : open(file.id)} />
            {file.media === 'audio' && <VoiceNotePlayer studentId={studentId} id={file.id} />}
          </li>
        ))}
      </ul>
      {viewing && (
        <FileViewer studentId={studentId} files={files} openId={viewing}
          onClose={() => setViewing(null)} />
      )}
    </section>
  );
}
