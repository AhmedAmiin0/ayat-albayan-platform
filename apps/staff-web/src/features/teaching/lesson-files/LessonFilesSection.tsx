import type { LessonAssets } from '@ab/shared';
import { t } from '@ab/web-kit';
import { LessonFileItem } from './LessonFileItem';
import { RecordingItem } from './RecordingItem';
import { ReportPdfItem } from './ReportPdfItem';
import { UploadBox } from './upload/UploadBox';
import { useLessonAssets } from './use-lesson-files';

const F = t.lessonFiles;

function Body({ data }: { data: LessonAssets }) {
  const group = data.students.length > 1;
  return (
    <>
      {data.recordings.map((rec) => <RecordingItem key={rec.id} rec={rec} group={group} />)}
      {data.files.length + data.reports.length > 0 ? (
        <ul className="grid">
          {data.files.map((f) => <LessonFileItem key={f.id} file={f} />)}
          {data.reports.map((r) => <ReportPdfItem key={r.id} report={r} named={group} />)}
        </ul>
      ) : (
        <p className="text-xs text-ink-3">{F.noFiles}</p>
      )}
      <p className="text-xs text-ink-3">{F.familyNote}</p>
      <UploadBox lessonId={data.lesson_id} />
    </>
  );
}

/** Admin and the teacher. */
export function LessonFilesSection({ lessonId }: { lessonId: string }) {
  const query = useLessonAssets(lessonId);
  return (
    <section aria-label={F.title} className="grid gap-3">
      <h3 className="text-sm font-bold">{F.title}</h3>
      {query.data && <Body data={query.data} />}
      {query.isError && <p role="alert" className="text-xs text-bad">{F.loadFailed}</p>}
    </section>
  );
}
