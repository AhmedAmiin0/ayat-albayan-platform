import type { PortalLessonFile } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { SectionHeader, Button } from '#/components/ui/index.ts';
import { fileLine, fileTitle } from '#/lesson-files/index.ts';
import { FileButtons } from '#/portal/report/FileButtons.tsx';
import { t } from '#/lib/i18n/index.ts';
import { VoiceNotePlayer } from './RecordingPlayer';
import { FileViewer } from './viewer/FileViewer';

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

/**
 * «ملفات الحلقة · 4» for the family (board FamFilesWebLesson): the report's PDF first, then a
 * voice note plays here and a picture or a PDF opens in the viewer on the page.
 */
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
