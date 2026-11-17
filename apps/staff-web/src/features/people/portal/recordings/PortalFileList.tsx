import type { PortalLessonFile } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { fileLine, fileTitle } from '@/features/teaching/lesson-files';
import { t } from '@/lib/i18n/i18n';
import { VoiceNotePlayer } from './RecordingPlayer';
import { useOpenLessonFile } from './use-recordings';

const F = t.lessonFiles;

interface Props {
  studentId: string;
  files: readonly PortalLessonFile[];
}

/** «ملفات الحلقة» for the family: a voice note plays here, a picture or PDF opens in a new tab. */
export function PortalFileList({ studentId, files }: Props) {
  const open = useOpenLessonFile(studentId);
  if (files.length === 0) return null;
  return (
    <section aria-label={F.title} className="grid gap-2">
      <h3 className="text-sm font-bold">{`${F.title} · ${F.count.replace('{n}', String(files.length))}`}</h3>
      <ul className="grid gap-3">
        {files.map((file) => (
          <li key={file.id} className="grid gap-1">
            <p className="text-sm font-semibold">{fileTitle(file)}</p>
            <p className="text-xs text-ink-3">{fileLine(file)}</p>
            {file.media === 'audio' ? (
              <VoiceNotePlayer studentId={studentId} id={file.id} />
            ) : (
              <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={() => open.mutate(file.id)}>
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
